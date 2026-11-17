import React, { useState } from 'react';

export default function KpiCards({ kpis, period = 'today', onDataRefresh }) {
  const p = (kpis?.period || period || 'today').toLowerCase();
  const periodLabelMap = {
    today: 'Today (Live Shift)',
    yesterday: 'Yesterday',
    '7d': 'Past 7 Days',
    '30d': 'Past 30 Days'
  };
  const pText = periodLabelMap[p] || 'Today';

  const totalPersonnel = kpis?.total_personnel ?? 224;
  const inCampusNow = kpis?.in_campus_now ?? kpis?.currently_in_hospital ?? 176;
  const inCampusPct = kpis?.in_campus_percent ?? (totalPersonnel ? Math.round((inCampusNow / totalPersonnel) * 1000) / 10 : 78.6);
  const checkedOut = kpis?.checked_out_today ?? 48;
  const lateArrivals = kpis?.late_arrivals ?? 0;
  const latePct = kpis?.late_arrivals_percent ?? 0;
  const avgActiveTime = kpis?.avg_active_time_str || kpis?.avg_daily_time_30d || '7h 26m';
  const avgActiveDiff = kpis?.avg_active_diff_str || '+14m vs avg.';
  const doctorsPresent = kpis?.doctors_present ?? 142;
  const totalDoctors = kpis?.total_doctors ?? 142;
  const doctorsPct = kpis?.doctors_percent ?? (totalDoctors ? Math.round((doctorsPresent / totalDoctors) * 1000) / 10 : 100);
  const productivityIndex = kpis?.productivity_index ?? 92.4;
  const avgStops = kpis?.avg_movement_stops ?? 2.1;
  const timeAtWork = kpis?.time_at_work_area ?? 88.6;

  // Late Arrival Threshold Management
  const lateTimeDisplay = kpis?.late_arrival_display || '09:00 AM';
  const lateThresholdTime = kpis?.late_arrival_time || '09:00';
  const [showLateModal, setShowLateModal] = useState(false);
  const [selectedLateTime, setSelectedLateTime] = useState(lateThresholdTime);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  const PRESETS = [
    { label: '08:00 AM', value: '08:00' },
    { label: '08:30 AM', value: '08:30' },
    { label: '09:00 AM', value: '09:00' },
    { label: '09:15 AM', value: '09:15' },
    { label: '09:30 AM', value: '09:30' },
    { label: '10:00 AM', value: '10:00' }
  ];

  const handleSaveThreshold = async (timeValue) => {
    const val = timeValue || selectedLateTime;
    if (!val) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ late_arrival_time: val })
      });
      if (res.ok) {
        const data = await res.json();
        setSaveSuccessMsg(`Shift threshold updated to ${data.late_arrival_display || val}!`);
        if (onDataRefresh) {
          onDataRefresh();
        }
        setTimeout(() => {
          setShowLateModal(false);
          setSaveSuccessMsg('');
        }, 900);
      } else {
        setSaveError('Failed to save settings. Please try again.');
      }
    } catch (e) {
      setSaveError(e.message || 'Connection error');
    } finally {
      setIsSaving(false);
    }
  };

  const cards = [
    {
      id: 'total_personnel',
      label: 'Employees (Active)',
      value: Number(totalPersonnel).toLocaleString(),
      secondary: null,
      subtext: `Total personnel enrolled (${pText})`,
      accent: '#2563eb', // Blue
      bgLight: '#eff6ff',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      id: 'in_campus',
      label: 'In Campus Now',
      value: Number(inCampusNow).toLocaleString(),
      secondary: `(${inCampusPct}%)`,
      subtext: `${checkedOut} departures verified today`,
      accent: '#059669', // Emerald Green
      bgLight: '#ecfdf5',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    },
    {
      id: 'avg_active_time',
      label: 'Avg. Active Time',
      value: avgActiveTime,
      secondary: null,
      subtext: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669', fontWeight: '700' }}>
          <span>▲</span> {avgActiveDiff}
        </span>
      ),
      accent: '#d97706', // Amber
      bgLight: '#fef3c7',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    },
    {
      id: 'late_arrivals',
      label: 'Late Arrivals',
      value: Number(lateArrivals).toLocaleString(),
      secondary: `(${latePct}%)`,
      subtext: `After ${lateTimeDisplay} shift start`,
      action: (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLateTime(kpis?.late_arrival_time || '09:00');
            setShowLateModal(true);
          }}
          title="Configure Late Arrival Shift Threshold"
          style={{
            marginTop: '3px',
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            color: '#c2410c',
            borderRadius: '4px',
            padding: '2px 7px',
            fontSize: '9.5px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            lineHeight: '1.2'
          }}
        >
          <span>⚙</span>
          <span>Shift Time: {lateTimeDisplay}</span>
        </button>
      ),
      accent: '#ea580c', // Orange
      bgLight: '#ffedd5',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )
    },
    {
      id: 'doctors_present',
      label: 'Doctors Present',
      value: `${doctorsPresent} / ${totalDoctors}`,
      secondary: `(${doctorsPct}%)`,
      subtext: 'Consultants & Specialists on duty',
      accent: '#7c3aed', // Purple
      bgLight: '#f5f3ff',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
          <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
          <circle cx="20" cy="10" r="2" />
        </svg>
      )
    },
    {
      id: 'productivity_index',
      label: 'Productivity Index',
      value: `${productivityIndex}%`,
      secondary: null,
      subtext: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669', fontWeight: '700' }}>
          <span>▲</span> +2.4 pp shift score
        </span>
      ),
      accent: '#10b981', // Emerald
      bgLight: '#ecfdf5',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
          <line x1="22" y1="11" x2="22" y2="13" />
          <line x1="6" y1="11" x2="6" y2="13" />
          <line x1="10" y1="11" x2="10" y2="13" />
        </svg>
      )
    },
    {
      id: 'movement_stops',
      label: 'Avg. Movement Stops',
      value: avgStops,
      secondary: null,
      subtext: 'Checkpoints per employee',
      accent: '#0284c7', // Sky Blue
      bgLight: '#f0f9ff',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
        </svg>
      )
    },
    {
      id: 'time_at_work',
      label: 'Time at Work Area',
      value: `${timeAtWork}%`,
      secondary: null,
      subtext: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669', fontWeight: '700' }}>
          <span>▲</span> Clinical & Ward Zones
        </span>
      ),
      accent: '#e11d48', // Rose / Red
      bgLight: '#ffe4e6',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      )
    }
  ];

  return (
    <>
      <div className="kpi-cards-grid">
        {cards.map((card) => (
          <div 
            key={card.id}
            className="med-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '10px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
          >
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: card.bgLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {card.icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#64748b',
                marginBottom: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {card.label}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '800',
                color: '#0f172a',
                lineHeight: '1.2',
                display: 'flex',
                alignItems: 'baseline',
                gap: '4px',
                flexWrap: 'wrap'
              }}>
                <span>{card.value}</span>
                {card.secondary && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: card.accent }}>
                    {card.secondary}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '10px',
                color: '#94a3b8',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {card.subtext}
              </div>
              {card.action && (
                <div>{card.action}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Late Arrival Threshold Settings Modal */}
      {showLateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setShowLateModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#ffedd5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '16px' }}>⏰</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Configure Shift Start / Late Cutoff
                  </h3>
                  <p style={{ margin: '1px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                    Staff checking in after this time will be flagged as Late Arrivals
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                  Quick Shift Start Presets:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {PRESETS.map((preset) => {
                    const isSelected = selectedLateTime === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setSelectedLateTime(preset.value)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #ea580c' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#fff7ed' : '#ffffff',
                          color: isSelected ? '#ea580c' : '#334155',
                          fontWeight: isSelected ? '800' : '600',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Or Custom Threshold (24h HH:MM):
                </label>
                <input
                  type="time"
                  value={selectedLateTime}
                  onChange={(e) => setSelectedLateTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {saveSuccessMsg && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#065f46',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>✓</span> {saveSuccessMsg}
                </div>
              )}

              {saveError && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  marginBottom: '12px'
                }}>
                  {saveError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setShowLateModal(false)}
                disabled={isSaving}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveThreshold(selectedLateTime)}
                disabled={isSaving}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: isSaving ? 'wait' : 'pointer',
                  boxShadow: '0 1px 2px rgba(234, 88, 12, 0.3)'
                }}
              >
                {isSaving ? 'Updating...' : 'Save & Recalculate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
