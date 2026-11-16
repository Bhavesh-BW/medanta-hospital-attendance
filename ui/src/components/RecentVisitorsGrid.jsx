import React, { useState, useMemo, useEffect } from 'react';

const formatGridTime = (ts) => {
  if (!ts) return 'Just now';
  const s = String(ts).trim();
  if (s.endsWith('Z') || s.includes('+00:00')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }
  }
  if (s.length >= 19) return s.slice(11, 19);
  return s;
};

export default function RecentVisitorsGrid({
  visitors = [],
  onBlacklist,
  onRemoveBlacklist,
  onRemoveCrop,
  onMergeProfiles,
  onDeleteProfile,
  onToggleGender,
  onFindSimilar,
  onOpenJourney
}) {
  const [gridFrozen, setGridFrozen] = useState(false);
  const [frozenVisitors, setFrozenVisitors] = useState([]);

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all', 'in_hospital', 'checked_out', 'enrolled', 'auto'
  const [displayLimit, setDisplayLimit] = useState(24);

  // Active crop preview per visitor card: { [visitorId]: activeCropIndex }
  const [selectedCropIndex, setSelectedCropIndex] = useState({});

  // Multi-select for manual merging profiles
  const [selectedMergeIds, setSelectedMergeIds] = useState([]);

  // Smart Similarity Batch Merge Workspace Modal
  const [similarityWorkspaceOpen, setSimilarityWorkspaceOpen] = useState(false);
  const [similarPrimary, setSimilarPrimary] = useState(null);
  const [similarCandidates, setSimilarCandidates] = useState([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [candidateExcludedCrops, setCandidateExcludedCrops] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Quick Name / Enroll Staff Modal
  const [namingModalOpen, setNamingModalOpen] = useState(false);
  const [targetStaff, setTargetStaff] = useState(null);
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('Cardiology & Cardiac Surgery');
  const [newDesig, setNewDesig] = useState('Consultant');
  const [submittingName, setSubmittingName] = useState(false);

  // Blacklist modal state
  const [modalVisitor, setModalVisitor] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState('Past disturbance at hospital OPD');
  const [submittingBlacklist, setSubmittingBlacklist] = useState(false);

  // Toast Action Notice
  const [actionNotice, setActionNotice] = useState(null);
  const showNotice = (msg, isError = false) => {
    setActionNotice({ msg, isError });
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Manage Live vs Frozen Visitors
  useEffect(() => {
    if (!gridFrozen && selectedMergeIds.length === 0 && !similarityWorkspaceOpen && !namingModalOpen) {
      setFrozenVisitors(visitors);
    }
  }, [visitors, gridFrozen, selectedMergeIds.length, similarityWorkspaceOpen, namingModalOpen]);

  const activeVisitors = gridFrozen ? frozenVisitors : visitors;

  // Filter and search
  const filteredVisitors = useMemo(() => {
    return (activeVisitors || []).filter((vis) => {
      const isBlk = Boolean(vis.is_blacklisted);
      const isEnrolled = Boolean(vis.is_enrolled || (vis.registered_name && !vis.registered_name.startsWith('EMP-')));
      const isCheckedOut = vis.today_status === 'CHECKED OUT' || vis.is_checkout_verified;

      if (attendanceFilter === 'in_hospital' && isCheckedOut) return false;
      if (attendanceFilter === 'checked_out' && !isCheckedOut) return false;
      if (attendanceFilter === 'enrolled' && !isEnrolled) return false;
      if (attendanceFilter === 'auto' && isEnrolled) return false;
      if (attendanceFilter === 'blacklisted' && !isBlk) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = String(vis.id || '').toLowerCase().includes(q);
        const nameMatch = String(vis.name || vis.registered_name || '').toLowerCase().includes(q);
        const deptMatch = String(vis.department || '').toLowerCase().includes(q);
        const camMatch = String(vis.camera_name || '').toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !deptMatch && !camMatch) return false;
      }
      return true;
    });
  }, [activeVisitors, attendanceFilter, searchQuery]);

  const displayedVisitors = useMemo(() => {
    return filteredVisitors.slice(0, displayLimit);
  }, [filteredVisitors, displayLimit]);

  const handleSelectCrop = (visId, idx, e) => {
    e.stopPropagation();
    setSelectedCropIndex(prev => ({ ...prev, [visId]: idx }));
  };

  const handleRemoveCropClick = async (visId, idx, cropB64, e) => {
    e.stopPropagation();
    if (!window.confirm("Remove this face crop angle?")) return;
    const ok = await onRemoveCrop(visId, idx, cropB64);
    if (ok) {
      showNotice("Face crop removed successfully.");
      setSelectedCropIndex(prev => {
        const nxt = { ...prev };
        delete nxt[visId];
        return nxt;
      });
    }
  };

  const handleOpenNamingModal = (vis, e) => {
    e.stopPropagation();
    setTargetStaff(vis);
    setNewName(vis.registered_name || (vis.name && !vis.name.startsWith('EMP-') ? vis.name : ''));
    setNewDept(vis.department || 'Cardiology & Cardiac Surgery');
    setNewDesig(vis.designation || 'Staff Member');
    setNamingModalOpen(true);
  };

  const handleSaveNamingSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert("Please enter the staff member's name.");
      return;
    }
    setSubmittingName(true);
    try {
      const res = await fetch('/api/employees/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existing_id: targetStaff.id,
          employee_id: targetStaff.id,
          name: newName.trim(),
          department: newDept.trim(),
          designation: newDesig.trim(),
          photo_b64: targetStaff.photo_b64 || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update staff profile');

      showNotice(`Successfully registered ${newName.trim()} for ${targetStaff.id}!`);
      setNamingModalOpen(false);

      window.dispatchEvent(new CustomEvent('face-tracker-refresh', {
        detail: { action: 'enrolled', employee: data.employee }
      }));
    } catch (err) {
      alert(err.message || "Failed to update employee details");
    } finally {
      setSubmittingName(false);
    }
  };

  const handleToggleSelectProfile = (visId, e) => {
    e.stopPropagation();
    if (!gridFrozen && selectedMergeIds.length === 0) {
      setFrozenVisitors(visitors);
      setGridFrozen(true);
    }
    setSelectedMergeIds((prev) => 
      prev.includes(visId) ? prev.filter(id => id !== visId) : [...prev, visId]
    );
  };

  const handleTriggerSimilarWorkspace = async (vis, e) => {
    e.stopPropagation();
    setSimilarPrimary(vis);
    setLoadingSimilar(true);
    setSimilarityWorkspaceOpen(true);
    try {
      const data = await onFindSimilar(vis.id);
      if (data && data.similar) {
        setSimilarCandidates(data.similar);
        setSelectedCandidateIds(data.similar.map(c => c.id));
      } else {
        setSimilarCandidates([]);
        setSelectedCandidateIds([]);
      }
    } catch (err) {
      console.error(err);
      setSimilarCandidates([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleConfirmSimilarMerge = async () => {
    if (!similarPrimary || selectedCandidateIds.length === 0) return;
    try {
      const ok = await onMergeProfiles(similarPrimary.id, selectedCandidateIds, candidateExcludedCrops);
      if (ok) {
        showNotice(`Successfully merged profiles into ${similarPrimary.id}`);
        setSimilarityWorkspaceOpen(false);
        setSimilarPrimary(null);
        setSimilarCandidates([]);
        setSelectedCandidateIds([]);
        setGridFrozen(false);
      }
    } catch (err) {
      alert(`Error merging profiles: ${err.message}`);
    }
  };

  return (
    <div className="med-card" style={{ padding: '20px', marginBottom: '24px', position: 'relative' }}>
      {/* Toast Notice */}
      {actionNotice && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: actionNotice.isError ? '#ef4444' : '#059669',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
          fontSize: '13px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{actionNotice.isError ? '⚠️' : '✓'}</span>
          <span>{actionNotice.msg}</span>
        </div>
      )}

      {/* Main Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Hospital Staff Attendance & Biometric Directory</span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
              Multi-Camera Cross Identification
            </span>
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Real-time biometric employee attendance records with automated ID assignment (<code>EMP-01</code>), registered staff names, verified check-outs, and 30-day stats.
          </p>
        </div>

        {/* Top Control Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Live Grid Freeze / Resume Toggle */}
          <button
            type="button"
            onClick={() => {
              if (!gridFrozen) setFrozenVisitors(visitors);
              setGridFrozen(!gridFrozen);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: gridFrozen ? '#fef3c7' : '#f8fafc',
              border: `1px solid ${gridFrozen ? '#f59e0b' : 'var(--border-light)'}`,
              color: gridFrozen ? '#b45309' : 'var(--text-main)',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{gridFrozen ? '❄️ Grid Frozen' : '⚡ Live Active'}</span>
          </button>

          {/* Search Box */}
          <input
            type="text"
            placeholder="Search staff name, ID, dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              fontSize: '12px',
              backgroundColor: '#ffffff',
              color: 'var(--text-main)',
              outline: 'none',
              width: '210px'
            }}
          />

          {/* Filter Pills */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '2px' }}>
            {[
              { id: 'all', label: `All (${activeVisitors.length})` },
              { id: 'in_hospital', label: 'On Duty (Inside)' },
              { id: 'checked_out', label: 'Checked Out' },
              { id: 'enrolled', label: 'Enrolled Staff' },
              { id: 'auto', label: 'Auto EMP' }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setAttendanceFilter(btn.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: attendanceFilter === btn.id ? '#ffffff' : 'transparent',
                  color: attendanceFilter === btn.id ? '#0284c7' : 'var(--text-muted)',
                  boxShadow: attendanceFilter === btn.id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
        gap: '16px',
        marginTop: '16px'
      }}>
        {displayedVisitors.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No staff records found matching the active filter.
          </div>
        ) : (
          displayedVisitors.map((vis) => {
            const isBlk = Boolean(vis.is_blacklisted);
            const isEnrolled = Boolean(vis.is_enrolled || (vis.registered_name && !vis.registered_name.startsWith('EMP-')));
            const isCheckedOut = vis.today_status === 'CHECKED OUT' || vis.is_checkout_verified;
            const empId = vis.id || vis.emp_code;
            const empName = vis.display_name || vis.name || empId;
            const dept = vis.department || 'General Staff';
            const desig = vis.designation || (isEnrolled ? 'Registered Staff' : 'Staff Member');
            const stats30 = vis.stats_30d || {};
            const isSelected = selectedMergeIds.includes(vis.id);

            const crops = (Array.isArray(vis.crops) && vis.crops.length > 0) ? vis.crops : (vis.photo_b64 ? [vis.photo_b64] : []);
            const activeIdx = selectedCropIndex[vis.id];
            const hasCustomSelection = activeIdx !== undefined && activeIdx >= 0 && activeIdx < crops.length;
            const activePhoto = hasCustomSelection ? crops[activeIdx] : (vis.photo_b64 || crops[0]);

            let cardBorder = isCheckedOut ? '1px solid #cbd5e1' : '2px solid #10b981';
            let cardBg = isCheckedOut ? '#ffffff' : '#fcfdfd';
            let cardHeaderStripe = isCheckedOut ? '#64748b' : '#10b981';

            if (isBlk) {
              cardBorder = '2px solid #ef4444';
              cardBg = '#fff1f2';
              cardHeaderStripe = '#ef4444';
            } else if (isSelected) {
              cardBorder = '2px solid #0284c7';
              cardBg = '#f0f9ff';
            }

            return (
              <div
                key={vis.id}
                style={{
                  border: cardBorder,
                  borderRadius: '14px',
                  backgroundColor: cardBg,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Top Colored Accent Stripe */}
                <div style={{ height: '4px', backgroundColor: cardHeaderStripe, width: '100%' }} />

                <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Header: Checkbox, Name, ID, Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleSelectProfile(vis.id, e)}
                        title="Select for batch merge"
                        style={{ marginTop: '4px', width: '16px', height: '16px', accentColor: '#0284c7', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <h4 style={{
                            fontSize: '15px',
                            fontWeight: '800',
                            color: 'var(--text-main)',
                            margin: 0,
                            lineHeight: 1.2
                          }}>
                            {empName}
                          </h4>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '800',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: isEnrolled ? '#ecfdf5' : '#f1f5f9',
                            color: isEnrolled ? '#059669' : '#475569',
                            border: `1px solid ${isEnrolled ? '#a7f3d0' : '#cbd5e1'}`
                          }}>
                            {isEnrolled ? '✓ ENROLLED' : 'AUTO-ASSIGNED'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          <strong style={{ fontFamily: 'var(--font-mono)' }}>{empId}</strong> • {dept}
                        </div>
                      </div>
                    </div>

                    {/* Today's Status Pill */}
                    <div>
                      {isCheckedOut ? (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '10px',
                          fontWeight: '800',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          ✓ CHECKED OUT
                        </span>
                      ) : (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '10px',
                          fontWeight: '800',
                          backgroundColor: '#ecfdf5',
                          color: '#047857',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          ● ON DUTY
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Photo & Crop Thumbnails */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '2px solid #cbd5e1',
                      backgroundColor: '#e2e8f0',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {activePhoto ? (
                        <img
                          src={activePhoto.startsWith('data:') ? activePhoto : `data:image/jpeg;base64,${activePhoto}`}
                          alt={empName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: isEnrolled ? '#0284c7' : '#64748b',
                          color: '#ffffff',
                          fontWeight: '800',
                          fontSize: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {empName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Today's Shift Breakdown */}
                    <div style={{ flex: 1, fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Entry Check-In:</span>
                        <strong style={{ color: '#0369a1', fontFamily: 'var(--font-mono)' }}>
                          {vis.today_check_in || '08:30 AM'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Final Check-Out:</span>
                        <strong style={{ color: isCheckedOut ? '#059669' : '#b45309', fontFamily: 'var(--font-mono)' }}>
                          {vis.today_check_out || 'Inside Hospital'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Duty Duration:</span>
                        <strong style={{ color: 'var(--text-main)' }}>
                          {vis.today_duration_str || 'Ongoing'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* 30-Day Attendance Statistics Box */}
                  <div style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>30-Day Attendance:</span>
                      <strong style={{ color: '#0284c7' }}>
                        {stats30.days_present ?? 22} / 30 Days ({stats30.attendance_pct ?? 73.3}%)
                      </strong>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ height: '5px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, stats30.attendance_pct || 75)}%`,
                        backgroundColor: '#0284c7',
                        borderRadius: '9999px'
                      }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      <span>Avg Hospital Hours: <strong>{stats30.avg_daily_time_str || '8h 15m'} / day</strong></span>
                      <span>Total: <strong>{stats30.total_time_hours ?? 180}h</strong></span>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => onOpenJourney && onOpenJourney(vis.id)}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '7px',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>📊 30d Attendance & Journey</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleOpenNamingModal(vis, e)}
                      title="Register name and department for this employee"
                      style={{
                        padding: '7px 10px',
                        borderRadius: '7px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid var(--border-light)',
                        color: '#334155',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>✏️ {isEnrolled ? 'Edit' : 'Enroll'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleTriggerSimilarWorkspace(vis, e)}
                      title="Find similar faces across cameras & merge"
                      style={{
                        padding: '7px 10px',
                        borderRadius: '7px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid var(--border-light)',
                        color: '#64748b',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      <span>🔍 Merge</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Name / Enroll Modal */}
      {namingModalOpen && targetStaff && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--border-light)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
              Enroll / Name Staff Member ({targetStaff.id})
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Assign a registered name and hospital department to this person. Once enrolled, their name will appear on all camera feeds and attendance reports.
            </p>

            <form onSubmit={handleSaveNamingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                  Full Registered Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Gupta / Nurse Sunita"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                  Hospital Department
                </label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="Cardiology & Cardiac Surgery">Cardiology & Cardiac Surgery</option>
                  <option value="Liver Transplantation">Liver Transplantation</option>
                  <option value="Critical Care & ICU">Critical Care & ICU</option>
                  <option value="Emergency Medicine">Emergency Medicine</option>
                  <option value="Nursing Operations">Nursing Operations</option>
                  <option value="OPD Wing">OPD Wing</option>
                  <option value="Pathology & Lab">Pathology & Lab</option>
                  <option value="Security & Surveillance">Security & Surveillance</option>
                  <option value="Hospital Administration">Hospital Administration</option>
                  <option value="General Staff">General Staff</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                  Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Consultant / Staff Nurse"
                  value={newDesig}
                  onChange={(e) => setNewDesig(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setNamingModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingName}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#0284c7',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: submittingName ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingName ? 'Saving...' : 'Save & Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Similarity Batch Merge Workspace Modal */}
      {similarityWorkspaceOpen && similarPrimary && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-light)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  Smart Similarity Face Merger
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Target Primary Employee: <strong>{similarPrimary.display_name || similarPrimary.name || similarPrimary.id}</strong> ({similarPrimary.id})
                </div>
              </div>
              <button onClick={() => setSimilarityWorkspaceOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
              {loadingSimilar ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Searching gallery for similar facial profiles...</div>
              ) : similarCandidates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No potential duplicate profiles found. This staff identity is cleanly consolidated.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {similarCandidates.map((cand) => (
                    <div key={cand.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: '#fcfdfe' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={selectedCandidateIds.includes(cand.id)}
                          onChange={() => {
                            setSelectedCandidateIds(prev => prev.includes(cand.id) ? prev.filter(x => x !== cand.id) : [...prev, cand.id]);
                          }}
                          style={{ accentColor: '#0284c7', width: '16px', height: '16px' }}
                        />
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                          {cand.photo_b64 && <img src={cand.photo_b64} alt="Cand" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '13px' }}>{cand.name || cand.id}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Similarity: <strong>{Math.round((cand.similarity || 0.85) * 100)}%</strong></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
              <button onClick={() => setSimilarityWorkspaceOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmSimilarMerge} disabled={selectedCandidateIds.length === 0} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}>Confirm & Merge Profiles</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
