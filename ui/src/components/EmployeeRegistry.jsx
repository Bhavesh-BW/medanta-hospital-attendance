import React, { useState, useMemo, useEffect } from 'react';

const DEPARTMENTS = [
  'Cardiology', 'Oncology', 'Neurosciences', 'Orthopaedics',
  'Emergency & Trauma', 'ICU & Critical Care', 'Nursing Services',
  'Operations (OT)', 'General Staff', 'Cardiology & Cardiac Surgery',
  'Liver Transplantation & Hepatobiliary', 'Critical Care & Anaesthesiology',
  'Nursing Operations', 'Security & Surveillance'
];

const ROLES = [
  'Consultant', 'Senior Consultant', 'Director', 'Staff Nurse', 'Head Nurse',
  'OT Technician', 'Staff Member', 'Registered Staff', 'Sr. Anaesthesiologist',
  'Security Officer', 'Admin Staff', 'Facility Support', 'Lab Technician',
  'Resident Doctor', 'Intern'
];

const fmtTime = (ts) => {
  if (!ts) return '—';
  if (typeof ts === 'string' && /am|pm/i.test(ts)) return ts;
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts.includes('T') ? ts.split('T')[1].slice(0, 5) : ts.slice(0, 5);
    return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return '—'; }
};

export default function EmployeeRegistry({ visitors = [], onDataRefresh, onSelectEmployee }) {
  // Top Tabs: 'details' (Employee Details) | 'absent' (Absent from Premises)
  const [activeSection, setActiveSection] = useState('details');

  // Live timer tick for real-time missing duration updates
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [absentFilter, setAbsentFilter] = useState('all'); // 'all' | 'lt30' | 'gt30' | 'gt60'
  const [sortBy, setSortBy] = useState('latest_seen');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', department: 'General Staff', designation: 'Staff Member', employee_id: '' });
  const [facePhoto, setFacePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const showNotice = (msg, ok = true) => {
    setNotice({ msg, ok });
    setTimeout(() => setNotice(null), 3500);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      setFacePhoto(b64);
      setPhotoPreview(b64);
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setFacePhoto(null);
    setPhotoPreview(null);
  };

  // Employees absent from premises (Checked in today, then exited and have not returned)
  const absentStaff = useMemo(() => {
    return visitors.filter(v => {
      const isCheckedOut = v.today_status === 'CHECKED OUT' || v.is_checkout_verified || v.is_absent_from_premises;
      const isExitLast = v.last_camera && (String(v.last_camera).toLowerCase().includes('exit') || String(v.camera_name || '').toLowerCase().includes('exit'));
      const hasCheckedIn = Boolean(v.today_check_in);
      const isNotBack = v.today_status !== 'IN HOSPITAL' && v.today_status !== 'in_hospital';
      return hasCheckedIn && (isCheckedOut || isExitLast) && isNotBack;
    }).map(v => {
      let missingMins = v.missing_mins || 0;
      const exitIso = v.exit_time_iso || v.today_check_out_raw || v.last_seen;
      if (exitIso) {
        try {
          const exitD = new Date(exitIso);
          if (!isNaN(exitD.getTime())) {
            missingMins = Math.max(1, Math.floor((nowTs - exitD.getTime()) / 60000));
          }
        } catch {
          missingMins = v.missing_mins || 1;
        }
      }
      if (missingMins < 1) missingMins = v.missing_mins || 1;

      let missingStr = v.missing_duration_str;
      if (missingMins >= 60) {
        const h = Math.floor(missingMins / 60);
        const m = missingMins % 60;
        missingStr = `${h}h ${String(m).padStart(2, '0')}m`;
      } else {
        missingStr = `${missingMins}m`;
      }

      return {
        ...v,
        live_missing_mins: missingMins,
        live_missing_str: missingStr
      };
    }).sort((a, b) => b.live_missing_mins - a.live_missing_mins);
  }, [visitors, nowTs]);

  // Absent staff filtered
  const filteredAbsent = useMemo(() => {
    return absentStaff.filter(v => {
      if (deptFilter !== 'all' && (v.department || 'General Staff') !== deptFilter) return false;
      if (absentFilter === 'lt30' && v.live_missing_mins >= 30) return false;
      if (absentFilter === 'gt30' && v.live_missing_mins < 30) return false;
      if (absentFilter === 'gt60' && v.live_missing_mins < 60) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const id = (v.id || '').toLowerCase();
        const name = (v.name || v.display_name || '').toLowerCase();
        const dept = (v.department || '').toLowerCase();
        const desig = (v.designation || '').toLowerCase();
        if (!id.includes(q) && !name.includes(q) && !dept.includes(q) && !desig.includes(q)) return false;
      }
      return true;
    });
  }, [absentStaff, deptFilter, absentFilter, search]);

  // Regular sorted visitors for 'details' tab
  const sortedVisitors = useMemo(() => {
    return [...visitors].sort((a, b) => {
      if (sortBy === 'latest_seen') {
        const at = a.last_seen || a.started_at || a.today_check_in || '';
        const bt = b.last_seen || b.started_at || b.today_check_in || '';
        return bt.localeCompare(at);
      }
      if (sortBy === 'check_in') {
        const at = a.today_check_in || '';
        const bt = b.today_check_in || '';
        return bt.localeCompare(at);
      }
      if (sortBy === 'emp_id') {
        const aid = (a.id || '').toLowerCase();
        const bid = (b.id || '').toLowerCase();
        return aid.localeCompare(bid, undefined, { numeric: true, sensitivity: 'base' });
      }
      // 'enrolled_first'
      const ae = a.is_enrolled ? 1 : 0, be = b.is_enrolled ? 1 : 0;
      if (ae !== be) return be - ae;
      const at = a.last_seen || a.today_check_in || '';
      const bt = b.last_seen || b.today_check_in || '';
      return bt.localeCompare(at);
    });
  }, [visitors, sortBy]);

  const filtered = useMemo(() => {
    return sortedVisitors.filter(v => {
      const isEnrolled = Boolean(v.is_enrolled);
      const isCheckedOut = v.today_status === 'CHECKED OUT' || v.is_checkout_verified;
      if (statusFilter === 'enrolled' && !isEnrolled) return false;
      if (statusFilter === 'auto' && isEnrolled) return false;
      if (statusFilter === 'in_hospital' && isCheckedOut) return false;
      if (statusFilter === 'checked_out' && !isCheckedOut) return false;
      if (deptFilter !== 'all' && (v.department || 'General Staff') !== deptFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const id = (v.id || '').toLowerCase();
        const name = (v.name || v.display_name || '').toLowerCase();
        const dept = (v.department || '').toLowerCase();
        const desig = (v.designation || '').toLowerCase();
        if (!id.includes(q) && !name.includes(q) && !dept.includes(q) && !desig.includes(q)) return false;
      }
      return true;
    });
  }, [sortedVisitors, search, statusFilter, deptFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, deptFilter, statusFilter, activeSection, absentFilter]);

  const deptCounts = useMemo(() => {
    const c = {};
    visitors.forEach(v => {
      const d = v.department || 'General Staff';
      c[d] = (c[d] || 0) + 1;
    });
    return c;
  }, [visitors]);

  const startEdit = (v, e) => {
    if (e) e.stopPropagation();
    setEditingId(v.id);
    setEditForm({ name: v.name || v.display_name || '', department: v.department || 'General Staff', designation: v.designation || 'Staff Member' });
  };

  const cancelEdit = (e) => {
    if (e) e.stopPropagation();
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (empId, e) => {
    if (e) e.stopPropagation();
    setSaving(true);
    try {
      const res = await fetch('/api/employees/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: empId, name: editForm.name || undefined, department: editForm.department, designation: editForm.designation })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      showNotice(`✓ ${empId} updated successfully`);
      setEditingId(null);
      if (onDataRefresh) onDataRefresh();
    } catch (err) {
      showNotice(err.message || 'Error saving', false);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const empId = addForm.employee_id.trim();
    const empName = addForm.name.trim() || empId; // Defaults to employee ID if blank
    setAdding(true);
    try {
      const res = await fetch('/api/employees/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: empName || undefined,
          employee_id: empId || undefined,
          department: addForm.department,
          designation: addForm.designation,
          photo_b64: facePhoto || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enroll failed');
      const assignedName = data.employee?.name || data.employee?.id || empName;
      showNotice(`✓ Added & enrolled profile ${assignedName}`);
      setAddForm({ name: '', department: 'General Staff', designation: 'Staff Member', employee_id: '' });
      clearPhoto();
      setAddOpen(false);
      setSortBy('latest_seen');
      setStatusFilter('all');
      setPage(1);
      if (onDataRefresh) onDataRefresh();
    } catch (err) {
      showNotice(err.message || 'Error adding employee', false);
    } finally {
      setAdding(false);
    }
  };

  // Summary stats for Absent Staff
  const absentStats = useMemo(() => {
    const total = absentStaff.length;
    const over30 = absentStaff.filter(s => s.live_missing_mins >= 30).length;
    const over60 = absentStaff.filter(s => s.live_missing_mins >= 60).length;
    const avgMins = total > 0 ? Math.round(absentStaff.reduce((acc, s) => acc + s.live_missing_mins, 0) / total) : 0;
    const avgStr = avgMins >= 60 ? `${Math.floor(avgMins / 60)}h ${avgMins % 60}m` : `${avgMins}m`;
    const longest = absentStaff[0]?.live_missing_str || '0m';
    return { total, over30, over60, avgStr, longest };
  }, [absentStaff]);

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px', overflow: 'hidden' }}>

      {/* Top Navigation Tabs Header (Styled exactly like reference dashboard) */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', backgroundColor: '#fafbfc' }}>
        
        {/* Left Tabs: Employee Details | Absent from Premises */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          {/* Tab 1: Employee Details */}
          <button
            onClick={() => setActiveSection('details')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: activeSection === 'details' ? '#0284c7' : 'transparent',
              color: activeSection === 'details' ? '#ffffff' : '#64748b',
              boxShadow: activeSection === 'details' ? '0 2px 4px rgba(2, 132, 199, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Employee Details
          </button>

          {/* Tab 2: Absent from Premises (New Requested Tab) */}
          <button
            onClick={() => setActiveSection('absent')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: activeSection === 'absent' ? '#dc2626' : 'transparent',
              color: activeSection === 'absent' ? '#ffffff' : '#64748b',
              boxShadow: activeSection === 'absent' ? '0 2px 4px rgba(220, 38, 38, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
            </svg>
            Absent from Premises
            <span style={{
              padding: '1px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: '800',
              backgroundColor: activeSection === 'absent' ? '#ffffff' : '#fee2e2',
              color: activeSection === 'absent' ? '#dc2626' : '#991b1b',
              boxShadow: activeSection === 'absent' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
            }}>
              {absentStaff.length}
            </span>
          </button>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {notice && (
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', backgroundColor: notice.ok ? '#dcfce7' : '#fee2e2', color: notice.ok ? '#15803d' : '#dc2626' }}>
              {notice.msg}
            </span>
          )}
          {activeSection === 'details' && (
            <button
              onClick={() => setAddOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Add Employee Form with Face Photo Upload */}
      {addOpen && activeSection === 'details' && (
        <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '170px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Name (defaults to ID if blank)</label>
                <input
                  value={addForm.name}
                  onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Defaults to ID"
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', width: '170px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Employee ID</label>
                <input
                  value={addForm.employee_id}
                  onChange={e => setAddForm(p => ({ ...p, employee_id: e.target.value }))}
                  placeholder="Auto-assigned (or enter ID)"
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', width: '180px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Department</label>
                <select value={addForm.department} onChange={e => setAddForm(p => ({ ...p, department: e.target.value }))}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', outline: 'none', cursor: 'pointer' }}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Role</label>
                <select value={addForm.designation} onChange={e => setAddForm(p => ({ ...p, designation: e.target.value }))}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', outline: 'none', cursor: 'pointer' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Face Photo Upload Button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Face Photo (for Recognition)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="file"
                    id="face-photo-input"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="face-photo-input"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #0284c7',
                      backgroundColor: '#f0f9ff',
                      color: '#0284c7',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    {photoPreview ? 'Change Photo' : 'Upload Face Photo'}
                  </label>
                  {photoPreview && (
                    <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #0284c7' }}>
                      <img src={photoPreview} alt="Face Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={clearPhoto}
                        style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', fontSize: '9px', cursor: 'pointer', padding: '1px 3px', lineHeight: 1 }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={adding}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '6px', backgroundColor: '#059669', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  {adding ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={() => { setAddOpen(false); clearPhoto(); setAddForm({ name: '', department: 'General Staff', designation: 'Staff Member', employee_id: '' }); }}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '12px', cursor: 'pointer', color: '#64748b' }}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 1: REGULAR EMPLOYEE DETAILS REGISTRY */}
      {activeSection === 'details' && (
        <>
          {/* Filter Bar */}
          <div style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#fafbfc' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ID, name, dept..."
                style={{ paddingLeft: '28px', paddingRight: '10px', paddingTop: '6px', paddingBottom: '6px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px', backgroundColor: '#fff', color: '#0f172a', outline: 'none', width: '200px' }}
              />
            </div>

            {/* Status Filter Pills */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              {[['all', `All (${visitors.length})`], ['enrolled', 'Named'], ['auto', 'Auto ID'], ['in_hospital', 'On Duty'], ['checked_out', 'Checked Out']].map(([id, label]) => (
                <button key={id} onClick={() => setStatusFilter(id)}
                  style={{ padding: '3px 10px', borderRadius: '5px', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                    backgroundColor: statusFilter === id ? '#ffffff' : 'transparent',
                    color: statusFilter === id ? '#0284c7' : '#64748b',
                    boxShadow: statusFilter === id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Department Dropdown */}
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px', backgroundColor: '#fff', color: '#334155', outline: 'none', cursor: 'pointer' }}>
              <option value="all">All Departments</option>
              {Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).map(([d, c]) => (
                <option key={d} value={d}>{d} ({c})</option>
              ))}
            </select>

            {/* Sort By Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Sort:</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px', backgroundColor: '#fff', color: '#0369a1', fontWeight: '700', outline: 'none', cursor: 'pointer' }}>
                <option value="latest_seen">⚡ Latest Detection (Real-Time)</option>
                <option value="check_in">🟢 Today Check-In Time</option>
                <option value="enrolled_first">✓ Enrolled Staff First</option>
                <option value="emp_id">🔢 Employee ID</option>
              </select>
            </div>

            <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
              {filtered.length} employees · Page {page}/{totalPages}
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Employee ID', 'Name / Status', 'Department', 'Role', 'Today In', 'Last Sighting', 'Today Out', 'Duty Hours', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan="9" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No employees match the current filter.</td></tr>
                ) : paged.map((v, idx) => {
                  const isEnrolled = Boolean(v.is_enrolled);
                  const isCheckedOut = v.today_status === 'CHECKED OUT' || v.is_checkout_verified;
                  const isEditing = editingId === v.id;
                  const displayName = v.name || v.display_name || v.id;
                  const inTime = fmtTime(v.today_check_in);
                  const outTime = v.is_checkout_verified ? fmtTime(v.today_check_out) : '—';
                  const dur = v.today_duration_str || (v.stats_30d?.today_duration) || '—';
                  const thumb = v.crops?.[0] || v.photo_b64 || null;

                  return (
                    <tr
                      key={v.id}
                      onClick={() => {
                        if (!isEditing && onSelectEmployee) {
                          onSelectEmployee(v.id);
                        }
                      }}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafbfc',
                        cursor: isEditing ? 'default' : 'pointer',
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => { if (!isEditing) e.currentTarget.style.backgroundColor = '#f0f9ff'; }}
                      onMouseLeave={e => { if (!isEditing) e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fafbfc'; }}
                      title="Click row to view face photo, CCTV body capture & in/out journey"
                    >
                      {/* ID */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '12px', color: '#0284c7' }}>{v.id}</span>
                      </td>

                      {/* Thumbnail + Name + badge */}
                      <td style={{ padding: '10px 14px', minWidth: '180px' }}>
                        {isEditing ? (
                          <input
                            value={editForm.name}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="Enter name..."
                            style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #93c5fd', fontSize: '12px', width: '150px', outline: 'none' }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#e2e8f0',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {thumb ? (
                                <img
                                  src={thumb.startsWith('data:') ? thumb : `data:image/jpeg;base64,${thumb}`}
                                  alt={v.id}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>
                                  {displayName.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: isEnrolled ? '700' : '500', color: isEnrolled ? '#0f172a' : '#64748b' }}>
                                  {displayName}
                                </span>
                                <span style={{ fontSize: '9px', fontWeight: '800', padding: '1px 5px', borderRadius: '4px',
                                  backgroundColor: isEnrolled ? '#ecfdf5' : '#f1f5f9',
                                  color: isEnrolled ? '#059669' : '#475569',
                                  border: `1px solid ${isEnrolled ? '#a7f3d0' : '#cbd5e1'}` }}>
                                  {isEnrolled ? '✓ ENROLLED' : 'AUTO ID'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Department */}
                      <td style={{ padding: '10px 14px' }}>
                        {isEditing ? (
                          <select
                            value={editForm.department}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))}
                            style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #93c5fd', fontSize: '12px', backgroundColor: '#fff', outline: 'none', cursor: 'pointer' }}>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        ) : (
                          <span style={{ color: '#334155', fontWeight: '600' }}>{v.department || 'General Staff'}</span>
                        )}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '10px 14px' }}>
                        {isEditing ? (
                          <select
                            value={editForm.designation}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setEditForm(p => ({ ...p, designation: e.target.value }))}
                            style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #93c5fd', fontSize: '12px', backgroundColor: '#fff', outline: 'none', cursor: 'pointer' }}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <span style={{ color: '#475569' }}>{v.designation || 'Staff Member'}</span>
                        )}
                      </td>

                      {/* Today In */}
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#0369a1', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        {inTime}
                      </td>

                      {/* Last Sighting */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#0f172a', fontWeight: '700' }}>
                          {fmtTime(v.last_seen || v.started_at || v.today_check_in)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {v.last_camera_name || v.camera_name || 'Staff Inbound Entry'}
                        </div>
                      </td>

                      {/* Today Out */}
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', whiteSpace: 'nowrap',
                        color: isCheckedOut ? '#15803d' : '#94a3b8', fontWeight: isCheckedOut ? '700' : 'normal' }}>
                        {outTime}
                      </td>

                      {/* Duty Hours */}
                      <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {dur}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={(e) => saveEdit(v.id, e)}
                              disabled={saving}
                              style={{ padding: '3px 8px', borderRadius: '5px', backgroundColor: '#059669', color: '#fff', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                              {saving ? '...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={{ padding: '3px 7px', borderRadius: '5px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '11px', cursor: 'pointer', color: '#475569' }}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                              backgroundColor: isCheckedOut ? '#f1f5f9' : '#ecfdf5',
                              color: isCheckedOut ? '#64748b' : '#059669' }}>
                              {isCheckedOut ? '✓ OUT' : '● ON DUTY'}
                            </span>
                            <button
                              onClick={(e) => startEdit(v, e)}
                              style={{ padding: '3px 8px', borderRadius: '5px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '11px', cursor: 'pointer', color: '#475569', fontWeight: '600' }}
                              title="Edit department and role"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectEmployee) onSelectEmployee(v.id);
                              }}
                              style={{ padding: '3px 8px', borderRadius: '5px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '11px', cursor: 'pointer', color: '#0284c7', fontWeight: '700' }}
                              title="View photos & in/out history"
                            >
                              View ➔
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafbfc' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '11px', fontWeight: '600', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, color: '#334155' }}>
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{ width: '28px', height: '28px', borderRadius: '5px', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                        backgroundColor: page === p ? '#0284c7' : '#fff',
                        color: page === p ? '#fff' : '#475569',
                        boxShadow: page === p ? '0 1px 2px rgba(2,132,199,0.3)' : 'none' }}>
                      {p}
                    </button>
                  );
                })}
                {totalPages > 5 && <span style={{ fontSize: '11px', color: '#94a3b8' }}>...</span>}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '11px', fontWeight: '600', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, color: '#334155' }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* VIEW 2: ABSENT FROM PREMISES (NEW REQUESTED TAB) */}
      {activeSection === 'absent' && (
        <div>
          {/* Executive Absence Insight Banner */}
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#fff7ed',
            borderBottom: '1px solid #fed7aa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#fed7aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c2410c'
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
                </svg>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#9a3412' }}>
                  Hospital Working Hours — Absence & Outside-Premises Monitoring
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#c2410c' }}>
                  Tracks employees who checked in today, crossed the exit gate during working hours, and have not yet been detected entering back.
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #fdba74', padding: '6px 12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#9a3412', textTransform: 'uppercase' }}>Currently Away</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#ea580c' }}>{absentStats.total} Staff</div>
              </div>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #fdba74', padding: '6px 12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#9a3412', textTransform: 'uppercase' }}>Avg Time Away</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#c2410c' }}>{absentStats.avgStr}</div>
              </div>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #fdba74', padding: '6px 12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#9a3412', textTransform: 'uppercase' }}>Over 30 Mins</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#b91c1c' }}>{absentStats.over30} Staff</div>
              </div>
            </div>
          </div>

          {/* Absence Filter Bar */}
          <div style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#fafbfc' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search absent employee..."
                style={{ paddingLeft: '28px', paddingRight: '10px', paddingTop: '6px', paddingBottom: '6px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px', backgroundColor: '#fff', color: '#0f172a', outline: 'none', width: '210px' }}
              />
            </div>

            {/* Severity Sub-Filter Pills */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              {[
                ['all', `All Absent (${absentStaff.length})`],
                ['lt30', `< 30m (${absentStaff.filter(s => s.live_missing_mins < 30).length})`],
                ['gt30', `> 30m (${absentStats.over30})`],
                ['gt60', `> 1h (${absentStats.over60})`]
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setAbsentFilter(id)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    backgroundColor: absentFilter === id ? '#ffffff' : 'transparent',
                    color: absentFilter === id ? '#ea580c' : '#64748b',
                    boxShadow: absentFilter === id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Department Dropdown */}
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px', backgroundColor: '#fff', color: '#334155', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Departments</option>
              {Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).map(([d, c]) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
              Sorted by: <strong>Longest Absence First</strong> · Live auto-updated
            </span>
          </div>

          {/* Absent Staff Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Employee ID', 'Employee / Face', 'Department', 'Shift Check-In', 'Premises Exit Time', 'Duty Before Exit', 'Time Missing / Absent', 'Exit Camera / Gate', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAbsent.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#059669', marginBottom: '4px' }}>
                        ✓ All Staff Are Currently Inside Premises
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        No employees currently detected as departed from hospital premises during their active shift.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAbsent.map((v, idx) => {
                    const thumb = v.crops?.[0] || v.photo_b64 || null;
                    const displayName = v.name || v.display_name || v.id;
                    const isEnrolled = Boolean(v.is_enrolled);
                    const missingMins = v.live_missing_mins || 1;
                    const missingStr = v.live_missing_str || `${missingMins}m`;

                    // Severity classification
                    let badgeBg = '#fef3c7';
                    let badgeColor = '#b45309';
                    let severityLabel = 'Break / Away';
                    if (missingMins >= 60) {
                      badgeBg = '#fee2e2';
                      badgeColor = '#b91c1c';
                      severityLabel = 'Critical Absence';
                    } else if (missingMins >= 30) {
                      badgeBg = '#ffedd5';
                      badgeColor = '#c2410c';
                      severityLabel = 'Extended Absence';
                    }

                    return (
                      <tr
                        key={v.id}
                        onClick={() => {
                          if (onSelectEmployee) onSelectEmployee(v.id);
                        }}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fffaf5',
                          cursor: 'pointer',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fffaf5'; }}
                        title="Click row to view complete face captures, entry/exit CCTV footage, and movement journey"
                      >
                        {/* ID */}
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '12px', color: '#0284c7' }}>
                            {v.id}
                          </span>
                        </td>

                        {/* Thumbnail + Name + Badge */}
                        <td style={{ padding: '10px 14px', minWidth: '190px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '7px',
                              overflow: 'hidden',
                              border: '1.5px solid #fdba74',
                              backgroundColor: '#fff7ed',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {thumb ? (
                                <img
                                  src={thumb.startsWith('data:') ? thumb : `data:image/jpeg;base64,${thumb}`}
                                  alt={v.id}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#9a3412' }}>
                                  {displayName.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: isEnrolled ? '700' : '600', color: '#0f172a' }}>
                                  {displayName}
                                </span>
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: '800',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #fca5a5'
                                }}>
                                  ● OUT
                                </span>
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                                {v.designation || 'Staff Member'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#334155', fontWeight: '600' }}>
                            {v.department || 'General Staff'}
                          </span>
                        </td>

                        {/* Shift Check-In */}
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#0369a1', fontWeight: '700' }}>
                            {fmtTime(v.today_check_in)}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                            Staff Inbound Entry
                          </div>
                        </td>

                        {/* Premises Exit Time */}
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#b91c1c', fontWeight: '700' }}>
                            {fmtTime(v.exit_time_iso || v.today_check_out || v.last_seen)}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                            Departed via Exit Gate
                          </div>
                        </td>

                        {/* Duty Before Exit */}
                        <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {v.today_duration_str || `${v.today_duration_mins || 0}m on-site`}
                        </td>

                        {/* Time Missing / Absent Duration (Live) */}
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            fontWeight: '800',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: badgeColor }} />
                            <span>{missingStr} missing</span>
                          </div>
                          <div style={{ fontSize: '10px', color: badgeColor, fontWeight: '700', marginTop: '2px' }}>
                            {severityLabel}
                          </div>
                        </td>

                        {/* Exit Camera / Gate */}
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>
                            {v.last_camera_name || v.camera_name || 'Staff Check-Out Exit'}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                            Gate 02 Departure
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectEmployee) onSelectEmployee(v.id);
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#fff7ed',
                              border: '1px solid #fdba74',
                              fontSize: '11px',
                              cursor: 'pointer',
                              color: '#c2410c',
                              fontWeight: '800',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Inspect biometric photos and movement journey"
                          >
                            View Journey ➔
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
