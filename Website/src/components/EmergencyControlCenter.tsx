import { useCallback } from 'react';
import { SectionLabel } from './SectionLabel';
import { ConnStrip } from './ConnStrip';
import { safeFetch, fmtDuration } from '../utils';
import { Bell, BellOff } from 'lucide-react';

interface EmCtrlProps {
  emergency: boolean;
  emergencyDuration: number;
  lastActivated: string | null;
  audioEnabled: boolean;
  esp32IP: string;
  camera1IP: string;
  camera2IP: string;
  cam1Status: 'online' | 'offline' | 'connecting';
  cam2Status: 'online' | 'offline' | 'connecting';
  gpsStatus: 'online' | 'offline' | 'connecting';
  controllerStatus: 'online' | 'offline' | 'connecting';
  onActivate: () => void;
  onClear: () => void;
  onToggleAudio: () => void;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

import type { Toast } from '../types';

export const EmergencyControlCenter = ({
  emergency,
  emergencyDuration,
  lastActivated,
  audioEnabled,
  esp32IP,
  camera1IP,
  camera2IP,
  cam1Status,
  cam2Status,
  gpsStatus,
  controllerStatus,
  onActivate,
  onClear,
  onToggleAudio,
  addToast,
}: EmCtrlProps) => {
  const handleActivate = useCallback(async () => {
    onActivate();

    // Call route camera1IP/emergency/on
    try {
      await safeFetch(`http://${camera1IP}/emergency/on`, 3000, { mode: 'no-cors' });
    } catch (e) {
      console.warn('Failed to reach Camera 1 emergency endpoint:', e);
    }

    // Call route camera2IP/emergency/on
    try {
      await safeFetch(`http://${camera2IP}/emergency/on`, 3000, { mode: 'no-cors' });
    } catch (e) {
      console.warn('Failed to reach Camera 2 emergency endpoint:', e);
    }

    // Call route esp32IP/emergency/on (legacy/fallback)
    try {
      await safeFetch(`http://${esp32IP}/emergency/on`, 3000, { mode: 'no-cors' });
    } catch (e) {
      console.warn('Failed to reach ESP32 controller directly:', e);
      addToast({
        borderColor: '#d29922',
        bg: 'rgba(210,153,34,0.06)',
        title: 'API Warning',
        message: `Could not sync activate status to controller at ${esp32IP}`
      });
    }
  }, [esp32IP, camera1IP, camera2IP, onActivate, addToast]);

  const handleClear = useCallback(async () => {
    onClear();

    // Call route camera1IP/emergency/off
    try {
      await safeFetch(`http://${camera1IP}/emergency/off`, 3000, { mode: 'no-cors' });
    } catch (e) {
      console.warn('Failed to reach Camera 1 clear endpoint:', e);
    }

    // Call route camera2IP/emergency/off
    try {
      await safeFetch(`http://${camera2IP}/emergency/off`, 3000, { mode: 'no-cors' });
    } catch (e) {
      console.warn('Failed to reach Camera 2 clear endpoint:', e);
    }

    // Call route esp32IP/emergency/off (legacy/fallback)
    try {
      await safeFetch(`http://${esp32IP}/emergency/off`, 3000, { mode: 'no-cors' });
    } catch (e) {
      console.warn('Failed to clear status on ESP32 controller:', e);
    }
  }, [esp32IP, camera1IP, camera2IP, onClear]);

  return (
    <div
      className={`rounded-xl ${emergency ? 'anim-card-throb' : ''} flex flex-col`}
      style={{
        background: emergency ? '#160c0c' : '#161b22',
        border: `1px solid ${emergency ? '#f85149' : '#21262d'}`,
        boxShadow: emergency ? undefined : '0 1px 3px rgba(0,0,0,0.4)',
        transition: 'background 0.3s, border-color 0.3s',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Top accent */}
      <div style={{ height: 3, background: emergency ? 'linear-gradient(90deg,#f85149,#ff7b72)' : 'linear-gradient(90deg,#3fb950,#56d364)', borderRadius: '12px 12px 0 0', transition: 'background 0.4s' }} />

      <div className="flex flex-col gap-2 p-2.5" style={{ flex: 1, minHeight: 0 }}>

        <SectionLabel>Emergency Control Center</SectionLabel>

        {/* Big status block */}
        <div
          className="flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl"
          style={{
            background: emergency ? 'rgba(248,81,73,0.06)' : 'rgba(63,185,80,0.04)',
            border: `1px solid ${emergency ? 'rgba(248,81,73,0.2)' : 'rgba(63,185,80,0.12)'}`,
            transition: 'all 0.4s',
          }}
        >
          {/* Status icon ring */}
          <div
            className={`flex items-center justify-center rounded-full ${emergency ? 'anim-pulse-red' : ''}`}
            style={{
              width: 44, height: 44,
              background: emergency ? 'rgba(248,81,73,0.12)' : 'rgba(63,185,80,0.10)',
              border: `2px solid ${emergency ? '#f85149' : '#3fb950'}`,
              transition: 'all 0.4s',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={emergency ? '#f85149' : '#3fb950'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {emergency
                ? <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
                : <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>}
              </svg>
          </div>

          <div className="text-center">
            <div
              className={`font-bold ${emergency ? 'anim-blink-live' : ''}`}
              style={{ fontSize: 16, color: emergency ? '#f85149' : '#3fb950', fontFamily: 'Inter, sans-serif', letterSpacing: '0.02em' }}
            >
              {emergency ? '⚠ EMERGENCY ACTIVE' : '● SYSTEM NORMAL'}
            </div>

            {emergency ? (
              <div className="mt-1">
                <div style={{ fontSize: 10, color: '#7d8590', fontFamily: 'Inter, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 1 }}>
                  Duration
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, color: '#f85149', fontWeight: 500, letterSpacing: '0.05em' }}>
                  {fmtDuration(emergencyDuration)}
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#7d8590', marginTop: 2 }}>
                {lastActivated
                  ? `Last alert: ${new Date(lastActivated).toLocaleString('en-US', { hour12: false })}`
                  : 'No alerts recorded'}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={handleActivate}
            disabled={emergency}
            className="crimeshield-btn crimeshield-btn-red flex-1"
            style={{ padding: '7px 10px', fontSize: 12 }}
          >
            Activate Emergency
          </button>
          <button
            onClick={handleClear}
            disabled={!emergency}
            className="crimeshield-btn crimeshield-btn-green flex-1"
            style={{ padding: '7px 10px', fontSize: 12 }}
          >
            Clear Emergency
          </button>
        </div>

        {/* Audio toggle */}
        <div
          className="flex items-center justify-between px-3 py-1.5 rounded-lg"
          style={{ background: '#1c2128', border: '1px solid #21262d' }}
        >
          <div className="flex items-center gap-2.5" style={{ fontSize: 12, color: '#7d8590', fontFamily: 'Inter, sans-serif' }}>
            {audioEnabled ? <Bell size={13} color="#3fb950" /> : <BellOff size={13} />}
            <span>Audio Alert</span>
            <span style={{ fontSize: 10, color: audioEnabled ? '#3fb950' : '#484f58', fontFamily: 'JetBrains Mono, monospace' }}>
              {audioEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={audioEnabled} onChange={onToggleAudio} />
            <span className="toggle-track" />
          </label>
        </div>

        {/* Connection strip */}
        <ConnStrip cam1={cam1Status} cam2={cam2Status} gps={gpsStatus} controller={controllerStatus} />
      </div>
    </div>
  );
};