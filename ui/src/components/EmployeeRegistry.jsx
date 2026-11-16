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
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
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

  // Sorted based on active sortBy selection
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
  useEffect(() => { setPage(1); }, [search, deptFilter, statusFilter]);

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
      showNotice(`✓ Added profile ${assignedName}`);
      setAddForm({ name: '', department: 'General Staff', designation: 'Staff Member', employee_id: '' });
      clearPhoto();
      setAddOpen(false);
      if (onDataRefresh) onDataRefresh();
    } catch (err) {
      showNotice(err.message || 'Error adding employee', false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Employee Registry
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
              {visitors.length} employees detected · {visitors.filter(v => v.is_enrolled).length} named & enrolled · Click any row to view face & body photos and in/out history
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {notice && (
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', backgroundColor: notice.ok ? '#dcfce7' : '#fee2e2', color: notice.ok ? '#15803d' : '#dc2626' }}>
              {notice.msg}
            </span>
          )}
          <button
            onClick={() => setAddOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Employee
          </button>
        </div>
      </div>

      {/* Add Employee Form with Face Photo Upload */}
      {addOpen && (
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
                  placeholder="EMP001 (or auto)"
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', width: '130px' }}
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
            </div>

            {/* Face Image Upload Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase' }}>
                  Face Image Upload:
                </label>
                {photoPreview ? (
                  <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #0284c7' }}>
                    <img src={photoPreview} alt="Face Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={clearPhoto}
                      style={{
                        position: 'absolute', top: 0, right: 0, width: '16px', height: '16px',
                        backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '0 0 0 4px',
                        fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                      }}
                      title="Remove image"
                    >✕</button>
                  </div>
                ) : (
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '6px', border: '1px dashed #0284c7',
                    backgroundColor: '#f0f9ff', color: '#0284c7', fontSize: '11px', fontWeight: '700',
                    cursor: 'pointer'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Choose Face Photo
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              <span style={{ fontSize: '11px', color: photoPreview ? '#15803d' : '#64748b', fontWeight: photoPreview ? '700' : 'normal' }}>
                {photoPreview ? '✓ Photo selected — will be indexed for instant AI face recognition' : 'Optional: Upload employee face image for AI biometric matching'}
              </span>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                <button type="submit" disabled={adding}
                  style={{ padding: '7px 16px', borderRadius: '7px', backgroundColor: '#059669', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', opacity: adding ? 0.6 : 1 }}>
                  {adding ? 'Saving...' : 'Save & Enroll'}
                </button>
                <button type="button" onClick={() => { setAddOpen(false); clearPhoto(); setAddForm({ name: '', department: 'General Staff', designation: 'Staff Member', employee_id: '' }); }}
                  style={{ padding: '7px 12px', borderRadius: '7px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

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
                        {/* Biometric Thumbnail */}
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
    </div>
  );
}
