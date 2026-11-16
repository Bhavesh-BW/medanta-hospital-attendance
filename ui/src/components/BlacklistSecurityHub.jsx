import React, { useState, useMemo } from 'react';

const formatAlertTime = (ts) => {
  if (!ts) return 'Just now';
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
  return s.replace('T', ' ').slice(0, 19);
};

export default function BlacklistSecurityHub({ watchlist, alerts, onRemoveBlacklist, onEnrollManual }) {
  const [activeTab, setActiveTab] = useState('enroll'); // 'enroll' | 'watchlist' | 'trail'
  const [search, setSearch] = useState('');
  const [selectedCamFilter, setSelectedCamFilter] = useState('all');
  
  // New Staff Enrollment Form State
  const [staffName, setStaffName] = useState('');
  const [staffEmpId, setStaffEmpId] = useState('');
  const [staffDept, setStaffDept] = useState('Cardiology');
  const [staffDesig, setStaffDesig] = useState('Consultant');
  const [staffPhotoB64, setStaffPhotoB64] = useState('');
  const [enrollingStaff, setEnrollingStaff] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState(null);

  // Pagination states
  const [trailPage, setTrailPage] = useState(1);
  const [trailPageSize, setTrailPageSize] = useState(10);
  const [watchlistPage, setWatchlistPage] = useState(1);
  const [watchlistPageSize, setWatchlistPageSize] = useState(10);

  // Filter alerts (sightings across all cameras)
  const filteredAlerts = useMemo(() => {
    return (alerts || []).filter(item => {
      const q = search.toLowerCase();
      const matchSearch = (
        (item.person_name || '').toLowerCase().includes(q) ||
        (item.watchlist_id || '').toLowerCase().includes(q) ||
        (item.camera_name || '').toLowerCase().includes(q) ||
        (item.location || '').toLowerCase().includes(q) ||
        (item.reason || '').toLowerCase().includes(q)
      );
      const matchCam = selectedCamFilter === 'all' || item.camera_id === selectedCamFilter;
      return matchSearch && matchCam;
    });
  }, [alerts, search, selectedCamFilter]);

  // Filter watchlist
  const filteredWatchlist = useMemo(() => {
    return (watchlist || []).filter(item => 
      (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.blacklist_reason || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.reason || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.person_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.alias || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [watchlist, search]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setStaffPhotoB64(uploadEvent.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEnrollStaffSubmit = async (e) => {
    e.preventDefault();
    if (!staffName.trim()) {
      alert("Please enter the staff member's full name.");
      return;
    }
    setEnrollingStaff(true);
    setEnrollMsg(null);
    try {
      const res = await fetch('/api/employees/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: staffName.trim(),
          employee_id: staffEmpId.trim() || undefined,
          department: staffDept.trim(),
          designation: staffDesig.trim(),
          photo_b64: staffPhotoB64 || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enroll staff member');

      setEnrollMsg({ type: 'success', text: `Successfully enrolled ${staffName}! Assigned ID: ${data.employee?.id}` });
      setStaffName('');
      setStaffEmpId('');
      setStaffPhotoB64('');

      window.dispatchEvent(new CustomEvent('face-tracker-refresh', {
        detail: { action: 'enrolled', employee: data.employee }
      }));
    } catch (err) {
      setEnrollMsg({ type: 'error', text: err.message || 'Error enrolling staff member' });
    } finally {
      setEnrollingStaff(false);
    }
  };

  return (
    <div className="med-card" style={{ padding: '20px', marginBottom: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Staff Biometric Registry & Security Management</span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#ecfdf5', color: '#059669' }}>
              HR Verified
            </span>
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Register new hospital doctors, nurses, and administrative staff members. Enrolled staff members are instantly recognized across all cameras by their registered names.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '2px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('enroll')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'enroll' ? '#ffffff' : 'transparent',
              color: activeTab === 'enroll' ? '#0284c7' : 'var(--text-muted)',
              boxShadow: activeTab === 'enroll' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            ➕ Enroll New Staff
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('watchlist')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'watchlist' ? '#ffffff' : 'transparent',
              color: activeTab === 'watchlist' ? '#0284c7' : 'var(--text-muted)',
              boxShadow: activeTab === 'watchlist' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            📋 Enrolled Roster ({watchlist.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trail')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'trail' ? '#ffffff' : 'transparent',
              color: activeTab === 'trail' ? '#dc2626' : 'var(--text-muted)',
              boxShadow: activeTab === 'trail' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            ⚠️ Threat Watchlist & Alerts ({alerts.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Enroll Staff Member */}
      {activeTab === 'enroll' && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          {enrollMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: '700',
              backgroundColor: enrollMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: enrollMsg.type === 'success' ? '#047857' : '#b91c1c',
              border: `1px solid ${enrollMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`
            }}>
              {enrollMsg.type === 'success' ? '✓ ' : '⚠️ '} {enrollMsg.text}
            </div>
          )}

          <form onSubmit={handleEnrollStaffSubmit} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                  Full Name (Doctor / Nurse / Staff) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Naresh Trehan / Sister Sunita Sharma"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                    Employee ID (Optional / Auto-Assigned)
                  </label>
                  <input
                    type="text"
                    placeholder="Leave empty for auto EMP-XX"
                    value={staffEmpId}
                    onChange={(e) => setStaffEmpId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: 'var(--font-mono)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                    Department
                  </label>
                  <select
                    value={staffDept}
                    onChange={(e) => setStaffDept(e.target.value)}
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
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                  Designation / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Consultant / Head Nurse / Floor Attendant"
                  value={staffDesig}
                  onChange={(e) => setStaffDesig(e.target.value)}
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

              <div style={{ marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={enrollingStaff}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: enrollingStaff ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(2,132,199,0.2)'
                  }}
                >
                  {enrollingStaff ? 'Registering Biometrics...' : 'Register & Enroll Staff Member'}
                </button>
              </div>
            </div>

            {/* Photo Upload & Biometric Preview */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '20px',
              backgroundColor: '#ffffff',
              textAlign: 'center'
            }}>
              {staffPhotoB64 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '110px', height: '110px', borderRadius: '14px', overflow: 'hidden', border: '2px solid #0284c7', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <img src={staffPhotoB64} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setStaffPhotoB64('')}
                    style={{
                      fontSize: '11px',
                      color: '#dc2626',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '700'
                    }}
                  >
                    Remove Photo
                  </button>
                </div>
              ) : (
                <div>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px auto' }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                    Upload Staff Photo / Headshot
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    YuNet face detector & SFace will extract 128-d deep biometric embedding
                  </div>
                  <label style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}>
                    Select Photo File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Enrolled Staff Roster */}
      {activeTab === 'watchlist' && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Staff Member</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Assigned Employee ID</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Department</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Enrollment Details</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Biometric Status</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWatchlist.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No enrolled staff records found.
                  </td>
                </tr>
              ) : (
                filteredWatchlist.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfe' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#e2e8f0', flexShrink: 0 }}>
                          {item.photo_b64 ? (
                            <img src={item.photo_b64.startsWith('data:') ? item.photo_b64 : `data:image/jpeg;base64,${item.photo_b64}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#64748b' }}>
                              {(item.name || 'EM').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.reason || 'Hospital Staff'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#0284c7' }}>
                      {item.alias || item.id}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-main)', fontWeight: '600' }}>
                      {item.category || 'Hospital Operations'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-dim)' }}>
                      Enrolled: {formatAlertTime(item.enrolled_at)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: '700', fontSize: '11px' }}>
                        ✓ Active & Verified
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => onRemoveBlacklist && onRemoveBlacklist(item)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Modify Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Threat Watchlist & Alerts */}
      {activeTab === 'trail' && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Target Name</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Alert ID</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Reason / Threat Category</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Camera / Sighting Location</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Sighting Time</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No security threat alerts or barred individuals logged.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((al, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: '#fff1f2' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '800', color: '#be123c' }}>{al.person_name}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{al.watchlist_id}</td>
                    <td style={{ padding: '12px 16px', color: '#991b1b' }}>{al.reason}</td>
                    <td style={{ padding: '12px 16px' }}>{al.camera_name || al.camera_id}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{formatAlertTime(al.timestamp)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: '800', fontSize: '10px' }}>
                        ACTIVE THREAT
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
