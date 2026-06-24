import { useState } from 'react';
import { X } from 'lucide-react';
import { saveConfig } from '../utils';
import type { AppConfig } from '../types';

interface SettingsModalProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
}



export const SettingsModal = ({
  config,
  onSave,
  onClose,
}: SettingsModalProps) => {
  const [local, setLocal] = useState<any>({ ...config });
  const set = (k: string, v: any) =>
    setLocal((p: any) => ({ ...p, [k]: v }));

  const handleSave = () => {
    const finalConfig: AppConfig = {
      ...local,
      fallbackLatitude: parseFloat(local.fallbackLatitude) || 12.971598,
      fallbackLongitude: parseFloat(local.fallbackLongitude) || 77.594566,
      pollingInterval: Number(local.pollingInterval),
      audioAlerts: Boolean(local.audioAlerts)
    };
    saveConfig(finalConfig);
    onSave(finalConfig);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', zIndex: 200, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{
          maxWidth: 440,
          background: 'rgba(28,33,40,0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          animation: 'fade-in-up 200ms ease',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <div className="font-semibold" style={{ fontSize: 15, color: '#e6edf3', fontFamily: 'Inter, sans-serif' }}>
              Settings
            </div>
            <div style={{ fontSize: 12, color: '#7d8590', marginTop: 2 }}>CrimeShield configuration</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="crimeshield-btn crimeshield-btn-ghost" style={{ padding: '6px' }}>
            <X size={15} />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-5 flex flex-col gap-4">
          {([
            ['Camera 1 IP', 'camera1IP', '10.200.21.145'],
            ['Camera 2 IP', 'camera2IP', '192.168.1.7'],
            ['ESP32 IP', 'esp32IP', '192.168.1.100'],
            ['Backend URL', 'backendUrl', 'http://localhost:3001'],
            ['Emergency Contact', 'emergencyContact', '+1234567890'],
            ['Pole Name', 'poleName', 'Pole A'],
            ['Fallback Latitude', 'fallbackLatitude', '12.971598'],
            ['Fallback Longitude', 'fallbackLongitude', '77.594566'],
          ] as const).map(([label, key, placeholder]) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 12, color: '#7d8590', marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>
                {label}
              </label>
              <input
                className="crimeshield-input"
                value={local[key] !== undefined ? String(local[key]) : ''}
                placeholder={placeholder}
                onChange={e => set(key, e.target.value)}
              />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#7d8590', marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>
              Poll Interval
            </label>
            <select className="crimeshield-select" value={local.pollingInterval} onChange={e => set('pollingInterval', Number(e.target.value))}>
              {[2, 5, 10, 30].map(v => (
                <option key={v} value={v}>
                  {v} seconds
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <div style={{ fontSize: 13, color: '#e6edf3', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                Audio Alerts
              </div>
              <div style={{ fontSize: 11, color: '#7d8590', marginTop: 2 }}>
                Beep on emergency activation
              </div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={local.audioAlerts} onChange={e => set('audioAlerts', e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleSave} className="crimeshield-btn crimeshield-btn-primary flex-1" style={{ padding: '10px' }}>
            Save Configuration
          </button>
          <button onClick={onClose} className="crimeshield-btn crimeshield-btn-ghost" style={{ padding: '10px 20px' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};