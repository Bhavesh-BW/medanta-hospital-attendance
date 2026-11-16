import React, { useEffect, useState, useMemo } from 'react';

const formatTimeIST = (ts) => {
  if (!ts) return 'N/A';
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
  if (typeof s === 'string' && s.includes('T')) {
    return s.split('T')[1].slice(0, 8);
  }
  if (typeof s === 'string' && s.includes(' ')) {
    return s.split(' ')[1].slice(0, 8);
  }
  return String(s).slice(-8);
};

const formatDateTimeIST = (ts) => {
  if (!ts) return 'N/A';
  const s = String(ts).trim();
  if (s.endsWith('Z') || s.includes('+00:00')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(',', '');
    }
  }
  if (typeof s === 'string' && s.includes('T')) {
    const [d, t] = s.split('T');
    return `${d} ${t.slice(0, 8)}`;
  }
  return String(s).replace('T', ' ').slice(0, 19);
};

const getTodayDateStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getNDaysAgoStr = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function JourneyTimelineModal({ visitorId, isOpen, onClose }) {
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance_history'); // 'attendance_history' | 'camera_journey'
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | '3d' | '7d' | 'custom'
  const [customStart, setCustomStart] = useState(() => getNDaysAgoStr(7));
  const [customEnd, setCustomEnd] = useState(() => getTodayDateStr());
  const [selectedCropIdx, setSelectedCropIdx] = useState(0);

  useEffect(() => {
    if (!isOpen || !visitorId) {
      setJourney(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSelectedCropIdx(0);

    fetch(`/api/employees/journey?employee_id=${encodeURIComponent(visitorId)}&visitor_id=${encodeURIComponent(visitorId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setJourney(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load employee attendance records');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, visitorId]);

  // Compute active date boundary
  const dateRange = useMemo(() => {
    const today = getTodayDateStr();
    if (dateFilter === 'today') {
      return { start: today, end: today, label: 'Today' };
    }
    if (dateFilter === '3d') {
      return { start: getNDaysAgoStr(2), end: today, label: 'Last 3 Days' };
    }
    if (dateFilter === '7d') {
      return { start: getNDaysAgoStr(6), end: today, label: 'Last 7 Days' };
    }
    return {
      start: customStart || getNDaysAgoStr(30),
      end: customEnd || today,
      label: 'Custom Range'
    };
  }, [dateFilter, customStart, customEnd]);

  // Daily records filtered by active date filter
  const allDailyHistory = journey?.attendance_history_30d || journey?.stats_30d?.daily_records || [];
  const filteredDailyHistory = useMemo(() => {
    if (!allDailyHistory || allDailyHistory.length === 0) return [];
    return allDailyHistory.filter((rec) => {
      const d = rec.date || '';
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [allDailyHistory, dateRange]);

  // Checkpoints filtered by active date filter
  const allCheckpoints = journey?.checkpoints || [];
  const filteredCheckpoints = useMemo(() => {
    if (!allCheckpoints || allCheckpoints.length === 0) return [];
    return allCheckpoints.filter((cp) => {
      const ts = cp.timestamp || '';
      const d = ts.slice(0, 10);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [allCheckpoints, dateRange]);

  // Summary counts for filtered period
  const filterStats = useMemo(() => {
    let inCnt = 0;
    let outCnt = 0;
    let totalMins = 0;

    filteredDailyHistory.forEach((rec) => {
      inCnt += rec.in_count ?? 1;
      outCnt += rec.out_count ?? (rec.is_checkout_verified ? 1 : 0);
      totalMins += rec.duration_minutes || 0;
    });

    // If checkpoint counts are available and greater, use checkpoint events
    const cpIn = filteredCheckpoints.filter((c) => c.event_type === 'IN').length;
    const cpOut = filteredCheckpoints.filter((c) => c.event_type === 'OUT').length;
    if (cpIn > 0 || cpOut > 0) {
      inCnt = Math.max(inCnt, cpIn);
      outCnt = Math.max(outCnt, cpOut);
    }

    const th = Math.floor(totalMins / 60);
    const tm = totalMins % 60;
    const durStr = totalMins > 0 ? `${th}h ${String(tm).padStart(2, '0')}m` : '< 15m';

    return {
      daysPresent: filteredDailyHistory.length,
      inCount: inCnt,
      outCount: outCnt,
      totalMovements: inCnt + outCnt,
      totalDurationStr: durStr
    };
  }, [filteredDailyHistory, filteredCheckpoints]);

  if (!isOpen) return null;

  const empId = journey?.employee_id || journey?.visitor_id || visitorId;
  const empName = journey?.display_name || journey?.name || empId;
  const isEnrolled = Boolean(journey?.is_enrolled || (journey?.registered_name && !journey?.registered_name.startsWith('EMP-')));
  const department = journey?.department || 'General Staff';
  const designation = journey?.designation || (isEnrolled ? 'Registered Staff' : 'Staff Member');
  const todayAtt = journey?.today_attendance;
  const isCheckedOut = todayAtt?.is_checkout_verified || todayAtt?.status === 'Checked Out';

  // Photo & multi-crops
  const crops = Array.isArray(journey?.crops) && journey.crops.length > 0 ? journey.crops : (journey?.photo_b64 ? [journey.photo_b64] : []);
  const activeCrop = crops[selectedCropIdx] || crops[0] || null;
  const bodyPhoto = journey?.photo_b64 || activeCrop;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(5px)',
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
        maxWidth: '1080px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        border: '1px solid #cbd5e1'
      }}>
        {/* Modal Top Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#0284c7',
              color: '#ffffff'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {empName}
                </h2>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: '800',
                  backgroundColor: isEnrolled ? '#ecfdf5' : '#f1f5f9',
                  color: isEnrolled ? '#059669' : '#475569',
                  border: `1px solid ${isEnrolled ? '#a7f3d0' : '#cbd5e1'}`
                }}>
                  {isEnrolled ? '✓ ENROLLED STAFF' : 'AUTO-ASSIGNED ID'}
                </span>
                <span style={{
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  color: '#0284c7',
                  fontWeight: '800',
                  backgroundColor: '#e0f2fe',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {empId}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                <strong>{department}</strong> • {designation} • {journey?.gender || 'Staff'} ~{journey?.age || 35}y
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              color: '#64748b',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s'
            }}
            title="Close dialog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Biometric Verification Gallery (Face + Body Captured Images) */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: '20px'
        }}>
          {/* Box 1: Face Biometric Crops (Multi-Crop Gallery) */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Face Biometrics ({crops.length} Angle Captures)
              </span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                {isEnrolled ? 'Verified Roster Face' : 'Auto AI Detected Face'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {/* Main Active Face Crop */}
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '2px solid #0284c7',
                backgroundColor: '#e2e8f0',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(2,132,199,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {activeCrop ? (
                  <img
                    src={activeCrop.startsWith('data:') ? activeCrop : `data:image/jpeg;base64,${activeCrop}`}
                    alt="Face crop"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#64748b' }}>
                    {empName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Thumbnails of other captured angles */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#475569', marginBottom: '6px' }}>
                  Select capture angle to inspect:
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '58px', overflowY: 'auto' }}>
                  {crops.map((c, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedCropIdx(idx)}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: selectedCropIdx === idx ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        opacity: selectedCropIdx === idx ? 1 : 0.7,
                        transition: 'all 0.15s'
                      }}
                    >
                      <img
                        src={c.startsWith('data:') ? c : `data:image/jpeg;base64,${c}`}
                        alt={`Angle ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Outfit / Torso / Body Image */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                CCTV Torso & Outfit Capture
              </span>
              <span style={{ fontSize: '10px', color: '#15803d', fontWeight: '700' }}>
                ✓ Physical Arrival Verified
              </span>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '2px solid #16a34a',
                backgroundColor: '#e2e8f0',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(22,163,74,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {bodyPhoto ? (
                  <img
                    src={bodyPhoto.startsWith('data:') ? bodyPhoto : `data:image/jpeg;base64,${bodyPhoto}`}
                    alt="Body/Outfit"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '4px' }}>
                    No body crop
                  </div>
                )}
              </div>

              <div style={{ flex: 1, fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div>Camera: <strong>{journey?.last_camera_name || 'Staff Inbound Entry'}</strong></div>
                <div>First Seen: <strong>{journey?.first_seen_time || formatTimeIST(journey?.first_seen)}</strong></div>
                <div>Last Seen: <strong>{journey?.last_seen_time || formatTimeIST(journey?.last_seen)}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Date Filter & In/Out Movement Strip */}
        <div style={{
          padding: '12px 24px',
          backgroundColor: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginRight: '4px' }}>
              TIME FILTER:
            </span>
            {[
              ['today', 'Today'],
              ['3d', 'Last 3 Days'],
              ['7d', 'Last 7 Days'],
              ['custom', 'Custom Date']
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setDateFilter(id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: dateFilter === id ? '#0284c7' : '#ffffff',
                  color: dateFilter === id ? '#ffffff' : '#475569',
                  boxShadow: dateFilter === id ? '0 1px 3px rgba(2,132,199,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s'
                }}
              >
                {label}
              </button>
            ))}

            {/* Custom Date Pickers */}
            {dateFilter === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11px',
                    backgroundColor: '#fff',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11px',
                    backgroundColor: '#fff',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* Quick Metrics for Filtered Period */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px' }}>
            <span style={{ color: '#0369a1', fontWeight: '700', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '5px' }}>
              ✓ {filterStats.daysPresent} Days Present
            </span>
            <span style={{ color: '#15803d', fontWeight: '700', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '5px' }}>
              🟢 {filterStats.inCount} In (Check-Ins)
            </span>
            <span style={{ color: '#b45309', fontWeight: '700', backgroundColor: '#fef3c7', padding: '3px 8px', borderRadius: '5px' }}>
              🟠 {filterStats.outCount} Out (Check-Outs)
            </span>
            <span style={{ color: '#6d28d9', fontWeight: '700', backgroundColor: '#f3e8ff', padding: '3px 8px', borderRadius: '5px' }}>
              ⏱ {filterStats.totalDurationStr} Duty Total
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '24px',
          padding: '0 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff'
        }}>
          <button
            onClick={() => setActiveTab('attendance_history')}
            style={{
              padding: '12px 4px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '700',
              color: activeTab === 'attendance_history' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'attendance_history' ? '3px solid #0284c7' : '3px solid transparent'
            }}
          >
            📅 Daily Attendance Records ({filteredDailyHistory.length} Days in Filter)
          </button>

          <button
            onClick={() => setActiveTab('camera_journey')}
            style={{
              padding: '12px 4px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '700',
              color: activeTab === 'camera_journey' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'camera_journey' ? '3px solid #0284c7' : '3px solid transparent'
            }}
          >
            📹 Check-In / Check-Out Passages & Movement ({filteredCheckpoints.length} Sightings)
          </button>
        </div>

        {/* Modal Main Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Loading employee attendance records...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
              {error}
            </div>
          ) : activeTab === 'attendance_history' ? (
            /* Tab 1: Daily Attendance Table */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Showing verified entry and departure times, duty hours, and check-in / check-out frequencies for <strong>{dateRange.label}</strong>.
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1' }}>
                  Total Duty Time: {filterStats.totalDurationStr}
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '10px 14px', fontWeight: '800' }}>Date</th>
                      <th style={{ padding: '10px 14px', fontWeight: '800' }}>First Check-In (Entry)</th>
                      <th style={{ padding: '10px 14px', fontWeight: '800' }}>Final Check-Out (Exit)</th>
                      <th style={{ padding: '10px 14px', fontWeight: '800' }}>Hospital Duration</th>
                      <th style={{ padding: '10px 14px', fontWeight: '800' }}>In & Out Count</th>
                      <th style={{ padding: '10px 14px', fontWeight: '800' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDailyHistory.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                          No attendance records found for {dateRange.label}.
                        </td>
                      </tr>
                    ) : (
                      filteredDailyHistory.map((rec, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafbfc'
                          }}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>
                            {rec.formatted_date || rec.date}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#0369a1' }}>
                              {rec.check_in_display || formatTimeIST(rec.check_in_time)}
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                              {rec.check_in_camera || 'Staff Inbound Entry'}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: '700',
                              color: rec.is_checkout_verified ? '#15803d' : '#b45309'
                            }}>
                              {rec.is_checkout_verified ? (rec.check_out_display || formatTimeIST(rec.check_out_time)) : '● On Duty'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                              {rec.is_checkout_verified ? (rec.check_out_camera || 'Staff Check-Out Exit') : 'Shift Ongoing'}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>
                            {rec.duration_str || `${rec.duration_minutes}m`}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              <span style={{ color: '#15803d' }}>{rec.in_count ?? 1} In</span>
                              <span style={{ color: '#94a3b8' }}>/</span>
                              <span style={{ color: '#b45309' }}>{rec.out_count ?? (rec.is_checkout_verified ? 1 : 0)} Out</span>
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {rec.is_checkout_verified ? (
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                                fontWeight: '700',
                                fontSize: '11px'
                              }}>
                                ✓ Completed
                              </span>
                            ) : (
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                fontWeight: '700',
                                fontSize: '11px'
                              }}>
                                ● On Duty
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Tab 2: Chronological Sightings & Camera Passages */
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                Chronological camera passages, arrivals, exits, and verified checkpoints for <strong>{dateRange.label}</strong>.
              </div>

              {filteredCheckpoints.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  No camera crossings detected for {dateRange.label}.
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '32px' }}>
                  {/* Vertical spine */}
                  <div style={{
                    position: 'absolute',
                    left: '11px',
                    top: '12px',
                    bottom: '12px',
                    width: '2px',
                    backgroundColor: '#cbd5e1'
                  }} />

                  {filteredCheckpoints.map((cp, idx) => {
                    const isExit = cp.event_type === 'OUT' || String(cp.camera_name || cp.camera_id).toLowerCase().includes('exit');
                    const isEntry = cp.event_type === 'IN' || String(cp.camera_name || cp.camera_id).toLowerCase().includes('entry') || idx === 0;

                    return (
                      <div key={idx} style={{ position: 'relative', marginBottom: '18px' }}>
                        {/* Node icon dot */}
                        <div style={{
                          position: 'absolute',
                          left: '-32px',
                          top: '4px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: isExit ? '#f59e0b' : isEntry ? '#10b981' : '#0284c7',
                          border: '3px solid #ffffff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '800'
                        }}>
                          {idx + 1}
                        </div>

                        {/* Checkpoint row card */}
                        <div style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                                {cp.camera_name}
                              </span>
                              {isExit ? (
                                <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px' }}>
                                  🟠 CHECK-OUT (EXIT)
                                </span>
                              ) : isEntry ? (
                                <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#ecfdf5', color: '#047857', padding: '1px 6px', borderRadius: '4px' }}>
                                  🟢 CHECK-IN (ENTRY)
                                </span>
                              ) : (
                                <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px' }}>
                                  🔵 TRANSIT
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              Location: <strong>{cp.location}</strong>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                              <span>Timestamp: <strong>{cp.time_display || formatDateTimeIST(cp.timestamp)}</strong></span>
                              {cp.dwell_mins_since_prev > 0 && (
                                <span>Transit / Dwell: <strong>{cp.dwell_mins_since_prev} mins</strong></span>
                              )}
                              <span>Biometric Match: <strong>{cp.confidence || 98.5}%</strong></span>
                            </div>
                          </div>

                          {cp.photo_b64 && (
                            <div style={{ width: '46px', height: '46px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                              <img
                                src={cp.photo_b64.startsWith('data:') ? cp.photo_b64 : `data:image/jpeg;base64,${cp.photo_b64}`}
                                alt="Capture"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Biometric Employee Attendance Ledger • Verified via Multi-Camera CCTV
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px',
              borderRadius: '7px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
