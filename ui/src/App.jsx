import React, { useState, useEffect, useCallback, useRef } from 'react';
import KpiCards from './components/KpiCards';
import LiveHudFeed from './components/LiveHudFeed';
import TrafficTrendChart from './components/TrafficTrendChart';
import EmployeeRegistry from './components/EmployeeRegistry';
import CinematicThreatAlert from './components/CinematicThreatAlert';
import JourneyTimelineModal from './components/JourneyTimelineModal';
import DepartmentAttendanceCard from './components/DepartmentAttendanceCard';
import { playTacticalChime } from './utils/alertSound';

export default function App() {
  const [clockTime, setClockTime] = useState(() => {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) + ' IST';
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(new Date().toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }) + ' IST');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [kpis, setKpis] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [activeCamera, setActiveCamera] = useState('staff');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedJourneyId, setSelectedJourneyId] = useState(null);
  const [trendRange, setTrendRange] = useState('today');
  const trendRangeRef = useRef('today');
  const [trendData, setTrendData] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch KPI & status data
  const fetchData = useCallback(async () => {
    try {
      const currentRange = trendRangeRef.current || 'today';
      const ts = Date.now();
      const [kpiRes, camRes, trendRes, visRes, watchRes, alertRes] = await Promise.all([
        fetch(`/api/kpis?range=${encodeURIComponent(currentRange)}&_t=${ts}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch(`/api/cameras?_t=${ts}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch(`/api/traffic-trend?range=${encodeURIComponent(currentRange)}&_t=${ts}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch(`/api/visitors?limit=100&_t=${ts}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch(`/api/watchlist?_t=${ts}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch(`/api/alerts?_t=${ts}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null)
      ]);

      if (kpiRes) setKpis(kpiRes);
      if (camRes?.cameras) {
        setCameras(camRes.cameras);
        if (camRes.active) setActiveCamera(camRes.active);
      }
      if (trendRes) setTrendData(trendRes);
      if (visRes) setVisitors(visRes);
      if (watchRes) setWatchlist(watchRes);
      if (alertRes) setAlerts(alertRes);
    } catch (e) {
      console.error("Fetch data error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen to instantaneous custom refresh events triggered by feed clicks or manual actions
  useEffect(() => {
    const handleInstantRefresh = (e) => {
      const detail = e?.detail;
      if (detail && detail.action === 'blacklisted') {
        const vid = detail.visitor_id;
        const wid = detail.watchlist_id || `BLK-${Date.now().toString(16).toUpperCase()}`;
        const name = detail.name || `Target ${vid}`;
        const reason = detail.alert?.reason || 'Flagged via Live HUD Click';
        const photo = detail.alert?.photo_b64 || null;

        const newAlert = detail.alert || {
          id: `ALT-${Date.now().toString(16).toUpperCase()}`,
          watchlist_id: wid,
          person_name: name,
          reason: reason,
          camera_id: 'staff',
          camera_name: 'Staff Inbound Entry',
          confidence: 0.99,
          photo_b64: photo,
          timestamp: new Date().toISOString(),
          status: 'open'
        };

        const newWatchItem = {
          id: wid,
          name: name,
          alias: vid,
          category: 'visitor',
          reason: reason,
          photo_b64: photo,
          crops: photo ? [photo] : [],
          enrolled_at: new Date().toISOString()
        };

        setAlerts((prev) => [newAlert, ...(prev || []).filter(a => a.id !== newAlert.id)]);
        setWatchlist((prev) => [newWatchItem, ...(prev || []).filter(w => w.id !== newWatchItem.id)]);
        setVisitors((prev) => (prev || []).map(v =>
          (v.id === vid) ? { ...v, is_blacklisted: true, blacklist_reason: reason } : v
        ));
      } else if (detail && detail.action === 'removed') {
        const vid = detail.visitor_id;
        const wid = detail.watchlist_id;
        setWatchlist((prev) => (prev || []).filter(w =>
          (!vid || (w.alias !== vid && w.id !== vid)) &&
          (!wid || (w.id !== wid && w.alias !== wid))
        ));
        setAlerts((prev) => (prev || []).filter(a =>
          (!vid || (a.watchlist_id !== vid && a.person_name !== vid && !String(a.person_name || '').includes(vid))) &&
          (!wid || (a.watchlist_id !== wid && a.person_name !== wid && !String(a.person_name || '').includes(wid)))
        ));
        setVisitors((prev) => (prev || []).map(v =>
          (v.id === vid || v.id === wid) ? { ...v, is_blacklisted: false, blacklist_reason: null } : v
        ));
      }
      fetchData();
    };
    window.addEventListener('face-tracker-refresh', handleInstantRefresh);
    return () => window.removeEventListener('face-tracker-refresh', handleInstantRefresh);
  }, [fetchData]);

  const dismissedTargetsRef = useRef(new Set());

  // Connect to SSE real-time alert stream
  useEffect(() => {
    let evtSource = null;
    try {
      evtSource = new EventSource('/api/alerts/events');
      evtSource.addEventListener('alert', (e) => {
        try {
          const alertPayload = JSON.parse(e.data);
          const wid = alertPayload.watchlist_id ? String(alertPayload.watchlist_id).toLowerCase() : null;
          const name = alertPayload.person_name ? String(alertPayload.person_name).toLowerCase() : null;
          const aid = alertPayload.id ? String(alertPayload.id).toLowerCase() : null;

          if (
            (wid && dismissedTargetsRef.current.has(wid)) ||
            (name && dismissedTargetsRef.current.has(name)) ||
            (aid && dismissedTargetsRef.current.has(aid))
          ) {
            return;
          }

          if (soundEnabled) {
            playTacticalChime();
          }
          setActiveAlert(alertPayload);
          setAlerts((prev) => [alertPayload, ...(prev || []).filter(a => a.id !== alertPayload.id)]);
        } catch (err) {
          console.error("Error processing SSE alert event:", err);
        }
      });
      evtSource.onerror = () => {
        // SSE reconnect handles automatically
      };
    } catch (e) {
      console.warn("SSE stream unavailable:", e);
    }
    return () => {
      if (evtSource) {
        evtSource.close();
      }
    };
  }, [soundEnabled]);

  const handleDismissAlert = (targetIdOrName) => {
    if (targetIdOrName) {
      dismissedTargetsRef.current.add(String(targetIdOrName).toLowerCase());
      if (activeAlert?.watchlist_id) dismissedTargetsRef.current.add(String(activeAlert.watchlist_id).toLowerCase());
      if (activeAlert?.person_name) dismissedTargetsRef.current.add(String(activeAlert.person_name).toLowerCase());
      if (activeAlert?.id) dismissedTargetsRef.current.add(String(activeAlert.id).toLowerCase());

      fetch('/api/alerts/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchlist_id: activeAlert?.watchlist_id,
          person_name: activeAlert?.person_name,
          id: activeAlert?.id
        })
      }).catch(() => { });
    }
    setActiveAlert(null);
  };

  // Periodic polling for KPIs and visitor logs
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSwitchCamera = async (camId) => {
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera: camId })
      });
      if (res.ok) {
        setActiveCamera(camId);
        fetchData();
      }
    } catch (e) {
      console.error("Switch camera error:", e);
    }
  };

  const handleAddCamera = async ({ name, location, rtsp }) => {
    try {
      const res = await fetch('/api/cameras/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location, rtsp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add camera');
      await fetchData();
      const newId = data.camera_id || data.camera?.id;
      if (newId) {
        await handleSwitchCamera(newId);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const handleRemoveCamera = async (camId) => {
    if (camId === 'staff' || camId === 'main') {
      alert("Primary entrance camera is protected and cannot be deleted.");
      return;
    }
    if (!window.confirm("Are you sure you want to remove this camera checkpoint?")) return;
    try {
      const res = await fetch('/api/cameras/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera_id: camId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove camera');
      await fetchData();
    } catch (e) {
      alert(`Error removing camera: ${e.message}`);
    }
  };

  const handleEditCamera = async ({ id, name, location, rtsp, role }) => {
    try {
      const res = await fetch('/api/cameras/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, location, rtsp, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to edit camera');
      await fetchData();
      return { success: true, camera: data.camera };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const handleTrendRangeChange = async (newRange) => {
    setTrendRange(newRange);
    trendRangeRef.current = newRange;
    try {
      const [trendRes, kpiRes] = await Promise.all([
        fetch(`/api/traffic-trend?range=${encodeURIComponent(newRange)}`).then(r => r.json()).catch(() => null),
        fetch(`/api/kpis?range=${encodeURIComponent(newRange)}`).then(r => r.json()).catch(() => null)
      ]);
      if (Array.isArray(trendRes)) {
        setTrendData(trendRes);
      }
      if (kpiRes) {
        setKpis(kpiRes);
      }
    } catch (e) {
      console.error("Trend/KPI fetch error:", e);
    }
  };

  const handleBlacklist = async (personId, name, reason) => {
    const targetId = String(personId).trim();
    const targetName = name || targetId;
    const targetReason = reason || 'Security Watchlist Notification';
    const tempBlkId = `BLK-${Date.now().toString(16).toUpperCase()}`;

    const currentVis = (visitors || []).find(v => v.id === targetId);
    const photo = currentVis?.photo_b64 || (currentVis?.crops && currentVis.crops[0]) || null;
    const crops = currentVis?.crops || (photo ? [photo] : []);

    const newWatchItem = {
      id: tempBlkId,
      name: targetName,
      alias: targetId,
      category: 'visitor',
      reason: targetReason,
      photo_b64: photo,
      crops: crops,
      enrolled_at: new Date().toISOString()
    };

    setWatchlist((prev) => [newWatchItem, ...(prev || []).filter(w => w.id !== tempBlkId && w.alias !== targetId && w.id !== targetId)]);
    setVisitors((prev) => (prev || []).map(v =>
      (v.id === targetId) ? { ...v, is_blacklisted: true, blacklist_reason: targetReason } : v
    ));

    try {
      const res = await fetch('/api/blacklist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: targetId, name: targetName, reason: targetReason })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to blacklist');
      if (json.watchlist) setWatchlist(json.watchlist);
      await fetchData();
    } catch (err) {
      console.error("Blacklist add error:", err);
      await fetchData();
    }
  };

  const handleRemoveBlacklist = async (itemOrId) => {
    const wid = (typeof itemOrId === 'object' && itemOrId !== null) ? itemOrId.id : itemOrId;
    const alias = (typeof itemOrId === 'object' && itemOrId !== null) ? itemOrId.alias : null;
    const name = (typeof itemOrId === 'object' && itemOrId !== null) ? itemOrId.name : null;

    const targetIds = new Set([String(wid).trim()]);
    if (alias) targetIds.add(String(alias).trim());

    setWatchlist((prev) => (prev || []).filter(w =>
      !targetIds.has(w.id) && !targetIds.has(w.alias) && (!name || w.name !== name)
    ));
    setAlerts((prev) => (prev || []).filter(a =>
      !targetIds.has(a.watchlist_id) &&
      (!alias || (a.watchlist_id !== alias && a.person_name !== alias && !String(a.person_name || '').includes(alias)))
    ));
    setVisitors((prev) => (prev || []).map(v =>
      (targetIds.has(v.id) || (alias && v.id === alias) || v.id === wid) ? { ...v, is_blacklisted: false, blacklist_reason: null } : v
    ));

    try {
      const res = await fetch('/api/blacklist/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlist_id: wid, alias: alias, name: name })
      });
      const data = await res.json().catch(() => null);
      if (data && data.watchlist) {
        setWatchlist(data.watchlist);
      }
    } catch (err) {
      console.error("Failed to remove from blacklist:", err);
      fetchData();
    }
  };

  const handleEnrollManual = async (photoB64, name, reason) => {
    const res = await fetch('/api/blacklist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_b64: photoB64, name, reason, is_photo: true })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to enroll');
    await fetchData();
  };

  const handleRemoveCrop = async (visitorId, cropIndex, cropB64 = null) => {
    try {
      const res = await fetch('/api/visitors/remove-crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId, crop_index: cropIndex, crop_b64: cropB64 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove crop');
      await fetchData();
      return true;
    } catch (e) {
      alert(`Error removing crop: ${e.message}`);
      return false;
    }
  };

  const handleMergeProfiles = async (primaryId, mergeIds, excludedCrops = []) => {
    try {
      const res = await fetch('/api/visitors/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_id: primaryId, merge_ids: mergeIds, excluded_crops: excludedCrops })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to merge profiles');
      await fetchData();
      return true;
    } catch (e) {
      alert(`Error merging profiles: ${e.message}`);
      return false;
    }
  };

  const handleDeleteProfile = async (visitorId) => {
    if (!window.confirm(`Are you sure you want to delete profile ${visitorId}?`)) return;
    try {
      const res = await fetch('/api/visitors/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      alert(`Error deleting profile: ${e.message}`);
    }
  };

  const handleToggleGender = async (visitorId, newGender) => {
    try {
      const res = await fetch('/api/visitors/toggle-gender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId, gender: newGender })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update gender');
      await fetchData();
      return true;
    } catch (e) {
      alert(`Error updating gender: ${e.message}`);
      return false;
    }
  };

  const handleFindSimilar = async (visitorId) => {
    try {
      const res = await fetch(`/api/visitors/similar?visitor_id=${encodeURIComponent(visitorId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to find similar profiles');
      return data;
    } catch (e) {
      alert(`Error finding similar profiles: ${e.message}`);
      return null;
    }
  };

  const handleTriggerTestAlert = async () => {
    try {
      if (soundEnabled) {
        playTacticalChime();
      }
      await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Vikramaditya Rao',
          reason: 'Barred from OPD Premises (Past Disturbance)'
        })
      });
    } catch (e) {
      console.error("Test alert error:", e);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px 32px', maxWidth: '1720px', margin: '0 auto' }}>
      {/* Tactical Threat Alert Floating Card */}
      <CinematicThreatAlert
        alert={activeAlert}
        onDismiss={handleDismissAlert}
        soundEnabled={soundEnabled}
      />

      {/* Staff Cross-Camera Journey & 30-Day Attendance Modal */}
      <JourneyTimelineModal
        visitorId={selectedJourneyId}
        isOpen={Boolean(selectedJourneyId)}
        onClose={() => setSelectedJourneyId(null)}
        onBlacklist={(vid) => {
          handleBlacklist(vid, null, 'Flagged from Journey Audit');
        }}
      />

      {/* Main Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Medanta Hospital – Staff Attendance Tracking System
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: '9999px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              fontSize: '11px',
              fontWeight: '700'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              Live
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '9999px',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--border-light)',
              color: '#059669',
              fontSize: '12px',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)'
            }}>
              🟢 {clockTime}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Multi-camera facial recognition staff attendance, automated employee identification, 30-day attendance statistics, and cross-camera movement intelligence.
          </p>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Period Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-light)',
            padding: '5px 12px',
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Period:</span>
            <select
              value={trendRange}
              onChange={(e) => handleTrendRangeChange(e.target.value)}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '12px',
                fontWeight: '700',
                color: '#0284c7',
                cursor: 'pointer',
                outline: 'none',
                padding: '2px 0'
              }}
            >
              <option value="today">• Today (Live Shift)</option>
              <option value="yesterday">Yesterday</option>
              <option value="7d">Past 7 Days</option>
              <option value="30d">Past 30 Days</option>
            </select>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextState = !soundEnabled;
              setSoundEnabled(nextState);
              if (nextState) {
                playTacticalChime();
              }
            }}
            title={soundEnabled ? 'Threat Alert Sound Enabled' : 'Threat Alert Sound Muted'}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: soundEnabled ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${soundEnabled ? '#bbf7d0' : 'var(--border-light)'}`,
              color: soundEnabled ? '#15803d' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <span>{soundEnabled ? '🔔 Sound ON' : '🔕 Sound OFF'}</span>
          </button>

          {/* Test Movie Alert Button */}
          <button
            type="button"
            onClick={handleTriggerTestAlert}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#e11d48',
              fontSize: '12px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(225,29,72,0.1)'
            }}
          >
            <span>⚡ Test Alert HUD</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchData}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-light)',
              color: 'var(--text-main)',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top 4 Attendance KPI Cards */}
      <KpiCards kpis={kpis} period={trendRange} />

      {/* Dynamic Multi-Camera Main Stage (LiveHudFeed + TrafficTrendChart) */}
      {viewMode === 'grid' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
          <LiveHudFeed
            activeCamera={activeCamera}
            cameras={cameras}
            onSwitchCamera={handleSwitchCamera}
            onAddCamera={handleAddCamera}
            onEditCamera={handleEditCamera}
            onRemoveCamera={handleRemoveCamera}
            fps={kpis?.fps}
            isRtspConnected={kpis?.is_rtsp_connected}
            onOpenJourney={(id) => setSelectedJourneyId(id)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onDataRefresh={fetchData}
          />
          <TrafficTrendChart
            trendData={trendData}
            activeFilter={trendRange}
            onFilterChange={handleTrendRangeChange}
          />
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: '24px',
          marginBottom: '24px'
        }}>
          <LiveHudFeed
            activeCamera={activeCamera}
            cameras={cameras}
            onSwitchCamera={handleSwitchCamera}
            onAddCamera={handleAddCamera}
            onEditCamera={handleEditCamera}
            onRemoveCamera={handleRemoveCamera}
            fps={kpis?.fps}
            isRtspConnected={kpis?.is_rtsp_connected}
            onOpenJourney={(id) => setSelectedJourneyId(id)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onDataRefresh={fetchData}
          />
          <TrafficTrendChart
            trendData={trendData}
            activeFilter={trendRange}
            onFilterChange={handleTrendRangeChange}
          />
        </div>
      )}

      {/* Department-wise Attendance */}
      <DepartmentAttendanceCard period={trendRange} />

      {/* Employee Registry — compact management table */}
      <EmployeeRegistry
        visitors={visitors}
        onDataRefresh={fetchData}
        onSelectEmployee={(id) => setSelectedJourneyId(id)}
      />
    </div>
  );
}
