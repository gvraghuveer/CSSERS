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
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);

    const t = setTimeout(() => {
      setLoadStream(true);
    }, 500);

    return () => {
      window.removeEventListener('keydown', fn);
      clearTimeout(t);
      // Force abort the active stream connection by clearing src before unmount
      const imgEl = document.getElementById(`camera-img-${label}-fullscreen`) as HTMLImageElement | null;
      if (imgEl) {
        imgEl.removeAttribute('src');
        imgEl.src = "";
      }
    };
  }, [onClose, label]);

  // Reset loading states when parameters or keys change
  useEffect(() => {
    setImgFailed(false);
    setImgLoaded(false);
  }, [ip, retryKey, loadStream]);

  // Watchdog timer: if stream is supposed to be active but has not loaded in 5s, mark as failed
  useEffect(() => {
    if (loadStream && status === 'online' && !imgLoaded && !imgFailed) {
      const t = setTimeout(() => {
        if (!imgLoaded) {
          console.warn(`[FullscreenModal] Stream loading timed out for ${label}. Marking as failed.`);
          setImgFailed(true);
        }
      }, 5000); // 5 seconds load timeout
      return () => clearTimeout(t);
    }
  }, [loadStream, status, imgLoaded, imgFailed, label]);

  // Auto-retry stream in fullscreen
  useEffect(() => {
    if (imgFailed && status === 'online') {
      const t = setTimeout(() => {
        setImgFailed(false);
        setImgLoaded(false);
        setRetryKey(prev => prev + 1);
      }, 4000); // Auto-retry after 4 seconds
      return () => clearTimeout(t);
    }
  }, [imgFailed, status]);

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
           {status === 'online' && !imgFailed ? (
            loadStream ? (
              <img
                id={`camera-img-${label}-fullscreen`}
                src={`http://${ip}:81/stream?t=${Date.now()}&r=${retryKey}`}
                alt={`${label} fullscreen`}
                crossOrigin="anonymous"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onLoad={() => {
                  console.log(`[FullscreenModal] Stream loaded successfully`);
                  setImgLoaded(true);
                }}
                onError={() => {
                  console.warn(`[FullscreenModal] Stream loading failed`);
                  setImgFailed(true);
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="anim-spin" style={{ width: 36, height: 36, border: '3px solid #21262d', borderTopColor: '#58a6ff', borderRadius: '50%' }} />
                <span style={{ fontSize: 14, color: '#7d8590', fontFamily: 'Inter, sans-serif' }}>Connecting to stream...</span>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <VideoOff size={40} color="#f85149" />
              <span style={{ color: '#f85149', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>No Signal</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#484f58' }}>{ip}:81</span>
              {status === 'online' && (
                <button
                  onClick={() => {
                    setImgFailed(false);
                    setImgLoaded(false);
                    setRetryKey(prev => prev + 1);
                  }}
                  className="crimeshield-btn mt-3"
                  style={{
                    padding: '6px 16px',
                    fontSize: 12,
                    color: '#58a6ff',
                    border: '1px solid rgba(88,166,255,0.2)',
                    background: 'rgba(88,166,255,0.05)',
                    cursor: 'pointer',
                    borderRadius: '6px'
                  }}
                >
                  Reconnect Stream
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};