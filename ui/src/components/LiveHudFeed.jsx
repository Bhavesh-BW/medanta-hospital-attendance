import React, { useState, useEffect } from 'react';
import { playTacticalChime } from '../utils/alertSound';

function CameraFormModal({
  isOpen,
  isEdit = false,
  onClose,
  onSubmit,
  onDeleteCamera,
  cameras = [],
  selectedId,
  onSelectCamera,
  camName,
  setCamName,
  camRole,
  setCamRole,
  camRtsp,
  setCamRtsp,
  submitting,
  error
}) {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="med-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>{isEdit ? '✏️' : '📹'}</span>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              {isEdit ? 'Edit Camera Checkpoint' : 'Add New Hospital Camera Checkpoint'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
          {isEdit
            ? 'Modify the camera name, attendance role, or RTSP stream URL for this checkpoint.'
            : 'Register an RTSP feed to continuously track staff attendance, movement, and duty hours across checkpoints.'}
        </p>

        <form onSubmit={onSubmit}>
          {isEdit && cameras.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Select Camera Checkpoint:
              </label>
              <select
                value={selectedId}
                onChange={(e) => onSelectCamera && onSelectCamera(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: '#f8fafc'
                }}
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id}) — {c.role === 'entry' ? 'Inbound Entry' : c.role === 'exit' ? 'Check-Out Exit' : 'Inwards / Perimeter'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 1. Camera Name */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Camera Name:
            </label>
            <input
              type="text"
              placeholder="e.g. Reception Desk Cam"
              value={camName}
              onChange={(e) => setCamName(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>

          {/* 2. Attendance Role */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Attendance Role:
            </label>
            <select
              value={camRole}
              onChange={(e) => setCamRole(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: '600',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <option value="entry">Inbound Entry (Daily Check-In & Entry Attendance)</option>
              <option value="internal">Inwards / Perimeter (Transit & Sighting Tracking)</option>
              <option value="exit">Check-Out Exit (Daily Check-Out & Departure Attendance)</option>
            </select>
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
              {camRole === 'entry' && '🟢 Inbound entry: Updates employee check-in time and logs checkpoint in journey.'}
              {camRole === 'internal' && '🔵 Inwards / perimeter: Updates the latest spotted snapshot in journey log without altering check-in/out.'}
              {camRole === 'exit' && '🟠 Check-out exit: Updates employee check-out time, calculates duty duration, and logs in journey.'}
            </span>
          </div>

          {/* 3. RTSP Stream URL */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                RTSP Stream URL:
              </label>
              <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>
                Port: 31554 / 40001
              </span>
            </div>
            <input
              type="text"
              placeholder="rtsp://124.123.89.162:31554/live/..."
              value={camRtsp}
              onChange={(e) => setCamRtsp(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>

          {error && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '12px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: isEdit ? 'space-between' : 'flex-end', alignItems: 'center', gap: '10px' }}>
            {isEdit && (() => {
              const entryCams = cameras.filter((c) => c.role === 'entry');
              const currentCam = cameras.find((c) => c.id === selectedId);
              const isSoleEntry = currentCam?.role === 'entry' && entryCams.length <= 1;
              if (cameras.length <= 1) {
                return (
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                    🔒 At least 1 camera required
                  </span>
                );
              }
              if (isSoleEntry) {
                return (
                  <span style={{ fontSize: '11px', color: '#b45309', fontStyle: 'italic' }}>
                    🔒 At least 1 entry camera required
                  </span>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => onDeleteCamera && onDeleteCamera(selectedId)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🗑 Delete Camera
                </button>
              );
            })()}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  backgroundColor: isEdit ? '#0f766e' : '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {submitting ? (isEdit ? 'Saving Changes...' : 'Adding Pipeline...') : (isEdit ? 'Save Camera Changes' : 'Add Camera Pipeline')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LiveHudFeed({
  activeCamera = 'main',
  cameras = [],
  onSwitchCamera,
  onAddCamera,
  onEditCamera,
  onRemoveCamera,
  fps,
  isRtspConnected,
  onOpenJourney,
  viewMode = 'grid',
  onViewModeChange,
  onDataRefresh,
  watchlistCount = 0,
  onOpenWatchlist
}) {
  const [internalViewMode, setInternalViewMode] = useState(viewMode || 'grid');
  const currentViewMode = onViewModeChange ? viewMode : internalViewMode;

  const handleModeChange = (mode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  // Selected cameras for slots (default to staff inbound and staff exit)
  const [slot1Camera, setSlot1Camera] = useState('staff');
  const [slot2Camera, setSlot2Camera] = useState('staff_exit');

  // Sync slots when cameras load
  useEffect(() => {
    if (cameras && cameras.length > 0) {
      if (!cameras.some(c => c.id === slot1Camera)) {
        const staffEntry = cameras.find(c => c.id === 'staff') || cameras[0];
        if (staffEntry) setSlot1Camera(staffEntry.id);
      }
      if (!cameras.some(c => c.id === slot2Camera)) {
        const staffExit = cameras.find(c => c.id === 'staff_exit') || cameras.find(c => c.id.includes('exit')) || cameras[1] || cameras[0];
        if (staffExit) setSlot2Camera(staffExit.id);
      }
    }
  }, [cameras]);

  const [hudEnabled, setHudEnabled] = useState(true);
  const [streamKey, setStreamKey] = useState(Date.now());
  const [quickBlacklistMode, setQuickBlacklistMode] = useState(false);
  const [clickEffect, setClickEffect] = useState(null);
  const [feedNotification, setFeedNotification] = useState(null);

  const showToast = (message, type = 'info') => {
    setFeedNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setFeedNotification((prev) => (prev && prev.message === message ? null : prev));
    }, 4500);
  };

  const handleFeedClick = async (e, camId) => {
    if (!quickBlacklistMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const containerW = rect.width;
    const containerH = rect.height;
    const streamAspect = 16 / 9;
    const containerAspect = containerW / containerH;

    let renderW, renderH, offsetX, offsetY;
    if (containerAspect > streamAspect) {
      renderH = containerH;
      renderW = containerH * streamAspect;
      offsetX = (containerW - renderW) / 2;
      offsetY = 0;
    } else {
      renderW = containerW;
      renderH = containerW / streamAspect;
      offsetX = 0;
      offsetY = (containerH - renderH) / 2;
    }

    const normX = (clickX - offsetX) / renderW;
    const normY = (clickY - offsetY) / renderH;

    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) {
      return;
    }

    setClickEffect({ x: clickX, y: clickY, camId, timestamp: Date.now() });
    setTimeout(() => setClickEffect(null), 1000);

    try {
      const res = await fetch('/api/feed/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camera: camId,
          x: normX,
          y: normY,
          action: 'toggle_blacklist'
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.action === 'blacklisted') {
          showToast(`🚨 TARGET FLAGGED: ${data.visitor_id} added to Watchlist!`, 'danger');
          try {
            playTacticalChime();
          } catch (err) {}
        } else if (data.action === 'removed') {
          showToast(`✓ Target ${data.visitor_id} removed from Watchlist`, 'info');
        }
        if (onDataRefresh) {
          try {
            await onDataRefresh();
          } catch (e) {
            console.error('Refresh error:', e);
          }
        }
        window.dispatchEvent(new CustomEvent('face-tracker-refresh', { detail: data }));
      } else {
        showToast(data.error || 'No face detected at clicked point', 'warning');
      }
    } catch (err) {
      console.error('Feed click error:', err);
    }
  };

  // Recent transits banner
  const [transits, setTransits] = useState([]);
  const [latestTransit, setLatestTransit] = useState(null);

  useEffect(() => {
    const fetchTransits = async () => {
      try {
        const res = await fetch('/api/transits');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setTransits(list);
            setLatestTransit(list[0]);
          }
        }
      } catch (e) {
        // quiet fallback
      }
    };
    fetchTransits();
    const timer = setInterval(fetchTransits, 5000);
    return () => clearInterval(timer);
  }, []);

  // Add Camera Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCamName, setNewCamName] = useState('');
  const [newCamLocation, setNewCamLocation] = useState('');
  const [newCamRtsp, setNewCamRtsp] = useState('');
  const [newCamRole, setNewCamRole] = useState('entry');
  const [submittingCam, setSubmittingCam] = useState(false);
  const [addError, setAddError] = useState('');

  const handleRefresh = () => {
    setStreamKey(Date.now());
  };

  const slot1Obj = cameras.find((c) => c.id === slot1Camera) || {
    id: slot1Camera,
    name: 'Main Porch Entry — Inbound',
    location: 'Gate 01 Main Entry',
    fps: fps || 16.2,
    is_connected: isRtspConnected
  };

  const slot2Obj = cameras.find((c) => c.id === slot2Camera) || {
    id: slot2Camera,
    name: 'Main porch exit',
    location: 'porch exit',
    fps: 16.8,
    is_connected: isRtspConnected
  };

  const focusCamObj = cameras.find((c) => c.id === activeCamera) || slot1Obj;

  const handleOpenAddModal = () => {
    setNewCamName('');
    setNewCamLocation('');
    setNewCamRtsp('');
    setNewCamRole('entry');
    setAddError('');
    setShowAddModal(true);
  };

  const handlePresetSelect = (name, loc, rtsp, role = 'entry') => {
    setNewCamName(name);
    setNewCamLocation(loc);
    setNewCamRtsp(rtsp);
    setNewCamRole(role);
  };

  const handleSubmitNewCamera = async (e) => {
    e.preventDefault();
    if (!newCamName.trim()) {
      setAddError('Please enter a camera name');
      return;
    }
    if (!newCamRtsp.trim()) {
      setAddError('Please enter an RTSP URL or stream source');
      return;
    }

    setSubmittingCam(true);
    setAddError('');
    try {
      if (onAddCamera) {
        const res = await onAddCamera({
          name: newCamName.trim(),
          location: newCamName.trim(),
          rtsp: newCamRtsp.trim(),
          role: newCamRole
        });
        if (res && res.success === false) {
          setAddError(res.error || 'Failed to add camera');
          setSubmittingCam(false);
          return;
        }
      }
      setShowAddModal(false);
      setStreamKey(Date.now());
    } catch (err) {
      setAddError(err.message || 'Error adding camera');
    } finally {
      setSubmittingCam(false);
    }
  };

  const handleDeleteCamera = async (camId) => {
    const camObj = cameras.find((c) => c.id === camId);
    const entryCameras = cameras.filter((c) => c.role === 'entry');
    if (camObj?.role === 'entry' && entryCameras.length <= 1) {
      alert("Cannot remove camera: At least one camera with 'entry' role must remain active in the system.");
      return;
    }
    if (cameras.length <= 1) {
      alert('At least one camera must remain active. Cannot delete the only remaining camera checkpoint.');
      return;
    }
    const camName = camObj?.name || camId;
    if (window.confirm(`Are you sure you want to remove camera checkpoint "${camName}"?`)) {
      if (onRemoveCamera) {
        await onRemoveCamera(camId);
      }
      if (showEditModal && editCamId === camId) {
        setShowEditModal(false);
      }
      setStreamKey(Date.now());
      if (onDataRefresh) onDataRefresh();
    }
  };

  // Manage All Cameras Modal State
  const [showManageModal, setShowManageModal] = useState(false);

  // Edit Camera Modal State & Handlers
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCamId, setEditCamId] = useState('');
  const [editCamName, setEditCamName] = useState('');
  const [editCamLocation, setEditCamLocation] = useState('');
  const [editCamRtsp, setEditCamRtsp] = useState('');
  const [editCamRole, setEditCamRole] = useState('entry');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const populateEditFields = (targetId) => {
    const cam = cameras.find((c) => c.id === targetId);
    if (cam) {
      setEditCamId(cam.id);
      setEditCamName(cam.name || '');
      setEditCamLocation(cam.location || '');
      setEditCamRtsp(cam.rtsp || '');
      setEditCamRole(cam.role || 'entry');
    }
  };

  const handleOpenEditModal = (targetCam) => {
    const idToEdit = targetCam?.id || targetCam || (cameras.length > 0 ? cameras[0].id : '');
    const cam = cameras.find((c) => c.id === idToEdit) || targetCam || {};
    setEditCamId(cam.id || idToEdit);
    setEditCamName(cam.name || '');
    setEditCamLocation(cam.location || '');
    setEditCamRtsp(cam.rtsp || '');
    setEditCamRole(cam.role || 'entry');
    setEditError('');
    setShowEditModal(true);
  };

  const handleSubmitEditCamera = async (e) => {
    e.preventDefault();
    if (!editCamId) return;
    if (!editCamName.trim()) {
      setEditError('Please enter a camera name');
      return;
    }
    if (!editCamRtsp.trim()) {
      setEditError('Please enter an RTSP URL or stream source');
      return;
    }

    setSubmittingEdit(true);
    setEditError('');
    try {
      if (onEditCamera) {
        const res = await onEditCamera({
          id: editCamId,
          name: editCamName.trim(),
          location: editCamLocation.trim() || 'Hospital Zone',
          rtsp: editCamRtsp.trim(),
          role: editCamRole
        });
        if (res && res.success === false) {
          setEditError(res.error || 'Failed to update camera');
          setSubmittingEdit(false);
          return;
        }
      }
      setShowEditModal(false);
      setStreamKey(Date.now());
      if (onDataRefresh) onDataRefresh();
    } catch (err) {
      setEditError(err.message || 'Error updating camera');
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="med-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Top Header Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Live Multi-Camera Staff Attendance & Recognition Grid</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: '700' }}>
                • {cameras.length} CHANNELS
              </span>
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
              Continuous facial feature extraction, cross-camera transit audit & blacklisted threat screening
            </p>
          </div>

          {/* Color Code Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ color: '#2563eb' }}>● Blue: Male</span>
            <span style={{ color: '#db2777' }}>● Pink: Female</span>
            <span style={{ color: '#059669' }}>● Green: Transit</span>
            <span style={{ color: '#dc2626' }}>● Red: Blacklist</span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* View Mode Toggle: Grid vs Focus */}
          <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => handleModeChange('grid')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: currentViewMode === 'grid' ? '#ffffff' : 'transparent',
                color: currentViewMode === 'grid' ? '#0f172a' : '#64748b',
                boxShadow: currentViewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>⊞</span> Grid (Dual-Cam)
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('focus')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: currentViewMode === 'focus' ? '#ffffff' : 'transparent',
                color: currentViewMode === 'focus' ? '#0f172a' : '#64748b',
                boxShadow: currentViewMode === 'focus' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>🔲</span> Focus (1-Cam)
            </button>
          </div>

          {/* Manage Cameras Button */}
          <button
            type="button"
            onClick={() => setShowManageModal(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            title="View, edit and configure all registered camera channels"
          >
            <span>⚙️</span> Manage Cameras ({cameras.length})
          </button>

          {/* Add Camera Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 1px 2px rgba(2,132,199,0.2)'
            }}
          >
            <span>+</span> Add Camera
          </button>

          {/* Edit Camera Button */}
          <button
            type="button"
            onClick={() => {
              const activeId = currentViewMode === 'focus' ? activeCamera : slot1Camera;
              const targetCam = cameras.find((c) => c.id === activeId) || cameras[0];
              handleOpenEditModal(targetCam);
            }}
            title="Edit camera settings or RTSP URL"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 1px 2px rgba(15,118,110,0.2)'
            }}
          >
            <span>✏️</span> Edit Camera
          </button>

          {/* HUD Toggle */}
          <button
            type="button"
            onClick={() => setHudEnabled(!hudEnabled)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: hudEnabled ? '#0f766e' : '#f1f5f9',
              color: hudEnabled ? '#ffffff' : '#64748b'
            }}
          >
            {hudEnabled ? 'HUD ON' : 'HUD OFF'}
          </button>

          {/* Quick Blacklist Mode Toggle */}
          <button
            type="button"
            onClick={() => setQuickBlacklistMode(!quickBlacklistMode)}
            title="Click directly on any face in the video feed to instantly blacklist them"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              border: quickBlacklistMode ? '1px solid #ef4444' : '1px solid #cbd5e1',
              cursor: 'pointer',
              backgroundColor: quickBlacklistMode ? '#fee2e2' : '#ffffff',
              color: quickBlacklistMode ? '#dc2626' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: quickBlacklistMode ? '0 0 10px rgba(239, 68, 68, 0.25)' : 'none'
            }}
          >
            <span>⚡</span>
            <span>{quickBlacklistMode ? 'CLICK-TO-FLAG: ON' : 'CLICK-TO-FLAG: OFF'}</span>
          </button>

          {/* Quick Jump to Security Watchlist */}
          {onOpenWatchlist && (
            <button
              type="button"
              onClick={onOpenWatchlist}
              title="View Security Watchlist / Blacklisted Persons"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
                border: '1px solid #fecdd3',
                backgroundColor: '#fff1f2',
                color: '#e11d48',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🚨</span>
              <span>Watchlist: {watchlistCount || 0}</span>
            </button>
          )}

          {/* Refresh Streams */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh video feeds"
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* Floating Instant Flag Toast Notification */}
      {feedNotification && (
        <div
          style={{
            marginBottom: '14px',
            padding: '10px 18px',
            borderRadius: '10px',
            backgroundColor: feedNotification.type === 'danger' ? '#fef2f2' : (feedNotification.type === 'warning' ? '#fffbeb' : '#f0fdf4'),
            border: `1px solid ${feedNotification.type === 'danger' ? '#fecaca' : (feedNotification.type === 'warning' ? '#fde68a' : '#bbf7d0')}`,
            color: feedNotification.type === 'danger' ? '#b91c1c' : (feedNotification.type === 'warning' ? '#b45309' : '#15803d'),
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <span>{feedNotification.message}</span>
          <button
            type="button"
            onClick={() => setFeedNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}




      {/* Cross-Camera Live Transit Ticker Banner */}
      {latestTransit && (
        <div
          style={{
            marginBottom: '14px',
            padding: '10px 16px',
            borderRadius: '10px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🔀</span>
            <div style={{ fontSize: '12px', color: '#166534' }}>
              <strong>CROSS-CAMERA TRANSIT LOGGED:</strong> Staff Member{' '}
              <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{latestTransit.visitor_id}</strong>{' '}
              ({latestTransit.gender?.toUpperCase() || 'PERSON'}, ~{latestTransit.age || 30}y) transitioned from{' '}
              <strong>[{latestTransit.from_camera_name || latestTransit.from_camera}]</strong> ➔{' '}
              <strong>[{latestTransit.to_camera_name || latestTransit.to_camera}]</strong>
              {latestTransit.dwell_mins ? ` (Dwell: ${latestTransit.dwell_mins} mins)` : ''}
            </div>
          </div>

          {onOpenJourney && (
            <button
              type="button"
              onClick={() => onOpenJourney(latestTransit.visitor_id)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>📍</span> View Journey Audit Trail
            </button>
          )}
        </div>
      )}




      {/* Main Video View Area */}
      {currentViewMode === 'grid' ? (
        /* DUAL CAMERA GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px', flex: 1 }}>
          {/* SLOT 1: ENTRY CAMERA */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #334155',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}
          >
            {/* Slot 1 Top Bar */}
            <div
              style={{
                padding: '8px 14px',
                backgroundColor: '#1e293b',
                borderBottom: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: '800' }}>
                  SLOT 1 • INBOUND
                </span>
                <select
                  value={slot1Camera}
                  onChange={(e) => setSlot1Camera(e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.location})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#38bdf8', fontWeight: '700' }}>
                  {slot1Obj.fps || 16.1} FPS
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: slot1Obj.is_connected !== false ? '#065f46' : '#78350f',
                    color: slot1Obj.is_connected !== false ? '#34d399' : '#fde047',
                    fontWeight: '700'
                  }}
                >
                  {slot1Obj.is_connected !== false ? '● ONLINE' : '● CONNECTING'}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(slot1Obj)}
                  title="Edit Camera Details & RTSP URL"
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
                    borderRadius: '4px',
                    padding: '2px 7px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  ✏️ Edit
                </button>
                {(() => {
                  const entryCams = cameras.filter((c) => c.role === 'entry');
                  const isSoleEntry = slot1Obj?.role === 'entry' && entryCams.length <= 1;
                  if (cameras.length > 1 && !isSoleEntry) {
                    return (
                      <button
                        type="button"
                        onClick={() => handleDeleteCamera(slot1Camera)}
                        title="Remove Camera"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '4px',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '11px',
                          padding: '2px 6px'
                        }}
                      >
                        🗑
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Video Player */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                backgroundColor: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: quickBlacklistMode ? 'crosshair' : 'default',
                userSelect: 'none'
              }}
              onClick={(e) => handleFeedClick(e, slot1Camera)}
              title={quickBlacklistMode ? "Click directly on any face in the feed to toggle blacklist" : ""}
            >
              <img
                src={`/api/stream/feed?camera=${encodeURIComponent(slot1Camera)}&hud=${hudEnabled ? 1 : 0}&t=${streamKey}`}
                alt={slot1Obj.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              {clickEffect && clickEffect.camId === slot1Camera && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${clickEffect.x}px`,
                    top: `${clickEffect.y}px`,
                    transform: 'translate(-50%, -50%)',
                    width: '44px',
                    height: '44px',
                    border: '2px solid #ef4444',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 60,
                    boxShadow: '0 0 16px #ef4444',
                    animation: 'ping 0.8s cubic-bezier(0, 0, 0.2, 1) infinite'
                  }}
                />
              )}
              <div
                style={{
                  display: 'none',
                  position: 'absolute',
                  inset: 0,
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#090d16',
                  color: '#94a3b8',
                  padding: '20px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📡</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>CONNECTING TO RTSP FEED...</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{slot1Obj.name} ({slot1Obj.rtsp || slot1Obj.location})</div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  style={{ marginTop: '12px', padding: '4px 12px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#38bdf8', fontSize: '11px', cursor: 'pointer' }}
                >
                  Retry Connection
                </button>
              </div>

              {/* Bottom HUD metadata line */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '4px 10px',
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#94a3b8'
                }}
              >
                <span>CH-01: {slot1Obj.name?.toUpperCase()}</span>
                <span>{slot1Obj.location?.toUpperCase()} • AES-256</span>
              </div>
            </div>
          </div>

          {/* SLOT 2: EXIT CAMERA */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #334155',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}
          >
            {/* Slot 2 Top Bar */}
            <div
              style={{
                padding: '8px 14px',
                backgroundColor: '#1e293b',
                borderBottom: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#7c3aed', color: '#ffffff', fontWeight: '800' }}>
                  SLOT 2 • OUTBOUND
                </span>
                <select
                  value={slot2Camera}
                  onChange={(e) => setSlot2Camera(e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.location})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#c084fc', fontWeight: '700' }}>
                  {slot2Obj.fps || 17.1} FPS
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: slot2Obj.is_connected !== false ? '#065f46' : '#78350f',
                    color: slot2Obj.is_connected !== false ? '#34d399' : '#fde047',
                    fontWeight: '700'
                  }}
                >
                  {slot2Obj.is_connected !== false ? '● ONLINE' : '● CONNECTING'}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(slot2Obj)}
                  title="Edit Camera Details & RTSP URL"
                  style={{
                    background: 'rgba(192, 132, 252, 0.15)',
                    border: '1px solid rgba(192, 132, 252, 0.4)',
                    color: '#c084fc',
                    borderRadius: '4px',
                    padding: '2px 7px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  ✏️ Edit
                </button>
                {(() => {
                  const entryCams = cameras.filter((c) => c.role === 'entry');
                  const isSoleEntry = slot2Obj?.role === 'entry' && entryCams.length <= 1;
                  if (cameras.length > 1 && !isSoleEntry) {
                    return (
                      <button
                        type="button"
                        onClick={() => handleDeleteCamera(slot2Camera)}
                        title="Remove Camera"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '4px',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '11px',
                          padding: '2px 6px'
                        }}
                      >
                        🗑
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Video Player */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                backgroundColor: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: quickBlacklistMode ? 'crosshair' : 'default',
                userSelect: 'none'
              }}
              onClick={(e) => handleFeedClick(e, slot2Camera)}
              title={quickBlacklistMode ? "Click directly on any face in the feed to toggle blacklist" : ""}
            >
              <img
                src={`/api/stream/feed?camera=${encodeURIComponent(slot2Camera)}&hud=${hudEnabled ? 1 : 0}&t=${streamKey}`}
                alt={slot2Obj.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              {clickEffect && clickEffect.camId === slot2Camera && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${clickEffect.x}px`,
                    top: `${clickEffect.y}px`,
                    transform: 'translate(-50%, -50%)',
                    width: '44px',
                    height: '44px',
                    border: '2px solid #ef4444',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 60,
                    boxShadow: '0 0 16px #ef4444',
                    animation: 'ping 0.8s cubic-bezier(0, 0, 0.2, 1) infinite'
                  }}
                />
              )}
              <div
                style={{
                  display: 'none',
                  position: 'absolute',
                  inset: 0,
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#090d16',
                  color: '#94a3b8',
                  padding: '20px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📡</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>CONNECTING TO RTSP FEED...</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{slot2Obj.name} ({slot2Obj.rtsp || slot2Obj.location})</div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  style={{ marginTop: '12px', padding: '4px 12px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#c084fc', fontSize: '11px', cursor: 'pointer' }}
                >
                  Retry Connection
                </button>
              </div>

              {/* Bottom HUD metadata line */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '4px 10px',
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#94a3b8'
                }}
              >
                <span>CH-02: {slot2Obj.name?.toUpperCase()}</span>
                <span>{slot2Obj.location?.toUpperCase()} • AES-256</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SINGLE FOCUS CAMERA VIEW */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #334155',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            flex: 1
          }}
        >
          {/* Focus Top Bar */}
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: '#1e293b',
              borderBottom: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: '800' }}>
                FOCUS VIEW
              </span>
              <select
                value={activeCamera}
                onChange={(e) => {
                  if (onSwitchCamera) onSwitchCamera(e.target.value);
                }}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  fontWeight: '700',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.location}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#38bdf8', fontWeight: '700' }}>
                {focusCamObj.fps || fps || 16.1} FPS
              </span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: focusCamObj.is_connected !== false ? '#065f46' : '#78350f',
                  color: focusCamObj.is_connected !== false ? '#34d399' : '#fde047',
                  fontWeight: '700'
                }}
              >
                {focusCamObj.is_connected !== false ? '● LIVE' : '● CONNECTING'}
              </span>
              <button
                type="button"
                onClick={() => handleOpenEditModal(focusCamObj)}
                title="Edit Camera Details & RTSP URL"
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  borderRadius: '4px',
                  padding: '3px 9px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ✏️ Edit Camera
              </button>
              {(() => {
                const entryCams = cameras.filter((c) => c.role === 'entry');
                const isSoleEntry = focusCamObj?.role === 'entry' && entryCams.length <= 1;
                if (cameras.length > 1 && !isSoleEntry) {
                  return (
                    <button
                      type="button"
                      onClick={() => handleDeleteCamera(activeCamera)}
                      title="Remove Camera"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      🗑 Remove Camera
                    </button>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Large Video Player */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              backgroundColor: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: quickBlacklistMode ? 'crosshair' : 'default',
              userSelect: 'none'
            }}
            onClick={(e) => handleFeedClick(e, activeCamera)}
            title={quickBlacklistMode ? "Click directly on any face in the feed to toggle blacklist" : ""}
          >
            <img
              src={`/api/stream/feed?camera=${encodeURIComponent(activeCamera)}&hud=${hudEnabled ? 1 : 0}&t=${streamKey}`}
              alt={focusCamObj.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {clickEffect && clickEffect.camId === activeCamera && (
              <div
                style={{
                  position: 'absolute',
                  left: `${clickEffect.x}px`,
                  top: `${clickEffect.y}px`,
                  transform: 'translate(-50%, -50%)',
                  width: '44px',
                  height: '44px',
                  border: '2px solid #ef4444',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  zIndex: 60,
                  boxShadow: '0 0 16px #ef4444',
                  animation: 'ping 0.8s cubic-bezier(0, 0, 0.2, 1) infinite'
                }}
              />
            )}
            <div
              style={{
                display: 'none',
                position: 'absolute',
                inset: 0,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#090d16',
                color: '#94a3b8',
                padding: '20px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📡</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9' }}>CONNECTING TO RTSP FEED...</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{focusCamObj.name} ({focusCamObj.rtsp || focusCamObj.location})</div>
              <button
                type="button"
                onClick={handleRefresh}
                style={{ marginTop: '12px', padding: '6px 14px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#38bdf8', fontSize: '12px', cursor: 'pointer' }}
              >
                Retry Connection
              </button>
            </div>

            {/* Bottom HUD metadata line */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '6px 14px',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(2px)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#94a3b8'
              }}
            >
              <span>CHANNEL: {focusCamObj.name?.toUpperCase()}</span>
              <span>INSIGHTFACE SFACE 512-D • AES-256 • {focusCamObj.location?.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}




      {/* Add Camera Modal */}
      <CameraFormModal
        isOpen={showAddModal}
        isEdit={false}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleSubmitNewCamera}
        camName={newCamName}
        setCamName={setNewCamName}
        camRole={newCamRole}
        setCamRole={setNewCamRole}
        camRtsp={newCamRtsp}
        setCamRtsp={setNewCamRtsp}
        submitting={submittingCam}
        error={addError}
      />

      {/* Edit Camera Modal */}
      <CameraFormModal
        isOpen={showEditModal}
        isEdit={true}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleSubmitEditCamera}
        onDeleteCamera={handleDeleteCamera}
        cameras={cameras}
        selectedId={editCamId}
        onSelectCamera={populateEditFields}
        camName={editCamName}
        setCamName={setEditCamName}
        camRole={editCamRole}
        setCamRole={setEditCamRole}
        camRtsp={editCamRtsp}
        setCamRtsp={setEditCamRtsp}
        submitting={submittingEdit}
        error={editError}
      />

      {/* Manage Cameras Hub Modal */}
      {showManageModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            zIndex: 99998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowManageModal(false)}
        >
          <div
            className="med-card"
            style={{
              width: '100%',
              maxWidth: '720px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📹 Registered Hospital Cameras ({cameras.length})
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Manage, edit details, or configure RTSP feeds and attendance roles for each checkpoint.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cameras.map((c) => {
                  const roleNormalized = (c.role || '').toLowerCase();
                  const isEntry = roleNormalized === 'entry';
                  const isExit = roleNormalized === 'exit';
                  const roleBadgeBg = isEntry ? '#ecfdf5' : isExit ? '#f5f3ff' : '#f1f5f9';
                  const roleBadgeColor = isEntry ? '#059669' : isExit ? '#7c3aed' : '#475569';
                  const roleLabel = isEntry ? '🟢 Inbound Entry' : isExit ? '🟠 Check-Out Exit' : '🔵 Inwards / Perimeter';

                  return (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', flex: 1 }}>
                        <span style={{ fontSize: '20px' }}>📹</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <b style={{ fontSize: '13px', color: '#0f172a' }}>{c.name}</b>
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: roleBadgeBg, color: roleBadgeColor, fontWeight: '700' }}>
                              {roleLabel}
                            </span>
                            {c.id === activeCamera && (
                              <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: '800' }}>
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'monospace', color: '#475569' }}>{c.rtsp}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', backgroundColor: c.is_connected !== false ? '#ecfdf5' : '#fef3c7', color: c.is_connected !== false ? '#059669' : '#b45309', fontWeight: '700' }}>
                          {c.is_connected !== false ? '● ONLINE' : '● CONNECTING'} {c.fps ? `(${c.fps} FPS)` : ''}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setShowManageModal(false);
                            handleOpenEditModal(c);
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          ✏️ Edit
                        </button>

                        {(() => {
                          const entryCams = cameras.filter((cam) => cam.role === 'entry');
                          const isSoleEntry = c.role === 'entry' && entryCams.length <= 1;
                          if (cameras.length <= 1) {
                            return (
                              <span style={{ width: '28px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }} title="At least one camera required">
                                🔒
                              </span>
                            );
                          }
                          if (isSoleEntry) {
                            return (
                              <span style={{ width: '28px', textAlign: 'center', fontSize: '12px', color: '#b45309' }} title="At least one Entry role camera is required and cannot be deleted">
                                🔒
                              </span>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => handleDeleteCamera(c.id)}
                              title={`Remove camera ${c.name}`}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#fee2e2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              🗑
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowManageModal(false);
                  handleOpenAddModal();
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>+</span> Add Another Camera Checkpoint
              </button>

              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                style={{ padding: '7px 16px', borderRadius: '8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
