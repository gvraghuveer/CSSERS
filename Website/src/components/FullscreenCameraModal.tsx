import { useState, useEffect } from 'react';
import { StatusBadge } from './StatusBadge';
import { X, VideoOff } from 'lucide-react';

interface FullscreenCameraModalProps {
  label: string;
  ip: string;
  status: 'online' | 'offline' | 'connecting';
  onClose: () => void;
}

export const FullscreenCameraModal = ({
  label,
  ip,
  status,
  onClose,
}: FullscreenCameraModalProps) => {
  const [loadStream, setLoadStream] = useState(false);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);

    const t = setTimeout(() => {
      setLoadStream(true);
    }, 500);

    return () => {
      window.removeEventListener('keydown', fn);
      clearTimeout(t);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)', zIndex: 200 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: '90vw', height: '90vh',
          background: 'rgba(22,27,34,0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          animation: 'fade-in-up 200ms ease',
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 z-10"
          style={{ background: 'rgba(13,17,23,0.75)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <span className="font-semibold" style={{ fontSize: 14, color: '#e6edf3', fontFamily: 'Inter, sans-serif' }}>{label}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#7d8590' }}>{ip}</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="crimeshield-btn crimeshield-btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }}>
            <X size={13} /> Close
          </button>
        </div>
        <div className="flex items-center justify-center w-full h-full" style={{ background: '#0d1117' }}>
          {status === 'online' ? (
            loadStream ? (
              <img
                id={`camera-img-${label}-fullscreen`}
                src={`http://${ip}:81/stream?t=${Date.now()}`}
                alt={`${label} fullscreen`}
                crossOrigin="anonymous"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="anim-spin" style={{ width: 36, height: 36, border: '3px solid #21262d', borderTopColor: '#58a6ff', borderRadius: '50%' }} />
                <span style={{ fontSize: 14, color: '#7d8590', fontFamily: 'Inter, sans-serif' }}>Connecting to stream...</span>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-3">
              <VideoOff size={40} color="#f85149" />
              <span style={{ color: '#f85149', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>No Signal</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};