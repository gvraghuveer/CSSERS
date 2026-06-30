import { useState, useEffect } from 'react';
import { StatusBadge } from './StatusBadge';
import { Camera, Video, VideoOff, Maximize2 } from 'lucide-react';


interface CameraCardProps {
  label: 'CAM-01' | 'CAM-02';
  ip: string;
  status: 'online' | 'offline' | 'connecting';
  emergency: boolean;
  onFullscreen: () => void;
  onSnapshot: () => void;
  isRecording: boolean;
  recordingSeconds: number;
  onToggleRecord: () => void;
  isPaused: boolean;
}

export const CameraCard = ({
  label,
  ip,
  status,
  emergency,
  onFullscreen,
  onSnapshot,
  isRecording,
  recordingSeconds,
  onToggleRecord,
  isPaused,
}: CameraCardProps) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [shouldStream, setShouldStream] = useState(!isPaused);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setImgFailed(false);
  }, [ip, status, retryKey]);

  useEffect(() => {
    if (imgFailed && status === 'online') {
      const t = setTimeout(() => {
        setImgFailed(false);
        setRetryKey(prev => prev + 1);
      }, 5000); // Auto-retry after 5 seconds
      return () => clearTimeout(t);
    }
  }, [imgFailed, status]);

  useEffect(() => {
    if (isPaused) {
      setShouldStream(false);
    } else {
      const t = setTimeout(() => {
        setShouldStream(true);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [isPaused]);

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100%' }}>
      {/* Card styling */}
      <div
        className={`rounded-xl ${emergency ? 'anim-card-throb' : ''}`}
        style={{
          background: emergency ? '#160c0c' : '#161b22',
          border: `1px solid ${emergency ? '#f85149' : '#21262d'}`,
          boxShadow: emergency ? undefined : '0 1px 3px rgba(0,0,0,0.4)',
          transition: 'background 0.3s, border-color 0.3s',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Colored top accent strip */}
        <div style={{
          height: 3,
          background: status === 'online'
            ? 'linear-gradient(90deg, #3fb950, #56d364)'
            : status === 'connecting'
              ? 'linear-gradient(90deg, #d29922, #e3b341)'
              : 'linear-gradient(90deg, #f85149, #ff7b72)',
          transition: 'background 0.4s',
          borderRadius: '12px 12px 0 0',
        }} />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #21262d' }}>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 32, height: 32,
                background: status === 'online' ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.08)',
                border: `1px solid ${status === 'online' ? 'rgba(63,185,80,0.2)' : 'rgba(248,81,73,0.15)'}`,
              }}
            >
              {status === 'online' ? <Camera size={16} color="#3fb950" /> : <VideoOff size={16} color="#f85149" />}
            </div>
            <div>
              <div className="font-semibold" style={{ fontSize: 14, color: '#e6edf3', fontFamily: 'Inter, sans-serif' }}>
                {label}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7d8590', marginTop: 1 }}>
                {ip}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />

            <button
              onClick={onFullscreen}
              aria-label={`Fullscreen ${label}`}
              className="flex items-center justify-center rounded-lg transition-all"
              style={{ width: 30, height: 30, color: '#7d8590', border: '1px solid #21262d', background: 'transparent' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3';
                (e.currentTarget as HTMLButtonElement).style.background = '#1c2128';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = '#7d8590';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        {/* Feed area */}
        <div className="relative flex items-center justify-center" style={{ background: '#0d1117', flex: 1, minHeight: 0 }}>
          {status === 'connecting' ? (
            <div className="flex flex-col items-center gap-3">
              <div className="anim-spin" style={{ width: 28, height: 28, border: '2px solid #21262d', borderTopColor: '#58a6ff', borderRadius: '50%' }} />
              <span style={{ fontSize: 13, color: '#7d8590', fontFamily: 'Inter, sans-serif' }}>Connecting...</span>
            </div>
          ) : (status === 'online' && !imgFailed) ? (
            <>
              <img
                id={`camera-img-${label}`}
                src={shouldStream ? `http://${ip}:81/stream?t=${Date.now()}&r=${retryKey}` : ""}
                alt={`${label} live feed`}
                crossOrigin="anonymous"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: shouldStream ? 'block' : 'none' }}
                onError={() => setImgFailed(true)}
              />
              {!shouldStream ? (
                isPaused ? (
                  <div className="flex flex-col items-center gap-3 text-center px-4">
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{ width: 52, height: 52, background: 'rgba(56,139,253,0.08)', border: '1px solid rgba(56,139,253,0.2)' }}
                    >
                      <Maximize2 size={24} color="#58a6ff" />
                    </div>
                    <div>
                      <div className="font-semibold" style={{ fontSize: 14, color: '#58a6ff', fontFamily: 'Inter, sans-serif' }}>Fullscreen Active</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#7d8590', marginTop: 4 }}>Stream redirected to overlay</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="anim-spin" style={{ width: 28, height: 28, border: '2px solid #21262d', borderTopColor: '#58a6ff', borderRadius: '50%' }} />
                    <span style={{ fontSize: 13, color: '#7d8590', fontFamily: 'Inter, sans-serif' }}>Resuming stream...</span>
                  </div>
                )
              ) : (
                <>
                  {/* HUD overlay */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.3) 100%)' }} />
                  {/* Live badge */}
                  <div
                    className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded"
                    style={{
                      background: isRecording ? 'rgba(248, 81, 73, 0.9)' : 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(4px)',
                      border: `1px solid ${isRecording ? '#f85149' : 'rgba(255,255,255,0.08)'}`,
                      transition: 'all 0.3s'
                    }}
                  >
                    <span className="rounded-full anim-blink-live" style={{ width: 6, height: 6, background: '#fff', display: 'inline-block' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif', letterSpacing: '0.08em' }}>
                      {isRecording ? `REC ${Math.floor(recordingSeconds / 60)}:${(recordingSeconds % 60).toString().padStart(2, '0')}` : 'LIVE'}
                    </span>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 52, height: 52, background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)' }}
              >
                <VideoOff size={24} color="#f85149" />
              </div>
              <div className="flex flex-col items-center">
                <div className="font-semibold" style={{ fontSize: 14, color: '#f85149', fontFamily: 'Inter, sans-serif' }}>No Signal</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#484f58', marginTop: 4 }}>{ip}:81</div>
                {status === 'online' && (
                  <button
                    onClick={() => {
                      setImgFailed(false);
                      setRetryKey(prev => prev + 1);
                    }}
                    className="crimeshield-btn mt-3"
                    style={{
                      padding: '4px 12px',
                      fontSize: 11,
                      color: '#58a6ff',
                      border: '1px solid rgba(88,166,255,0.2)',
                      background: 'rgba(88,166,255,0.05)',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      marginTop: '8px'
                    }}
                  >
                    Reconnect Stream
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderTop: '1px solid #21262d' }}
        >
          <div className="flex items-center gap-1.5">
            {status === 'online' ? (
              <>
                <span className="anim-blink-live rounded-full" style={{ width: 6, height: 6, background: '#3fb950', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#3fb950', fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em' }}>LIVE STREAM</span>
              </>
            ) : (
              <>
                <span className="rounded-full" style={{ width: 6, height: 6, background: '#484f58', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#484f58', fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em' }}>OFFLINE</span>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onToggleRecord}
              disabled={status !== 'online'}
              aria-label={isRecording ? `Stop recording ${label}` : `Record ${label}`}
              className="crimeshield-btn"
              style={{
                padding: '5px 10px',
                fontSize: 11,
                color: status !== 'online' ? '#484f58' : isRecording ? '#f85149' : '#7d8590',
                border: `1px solid ${status !== 'online' ? '#21262d' : isRecording ? '#f8514980' : '#30363d'}`,
                background: status === 'online' && isRecording ? 'rgba(248, 81, 73, 0.1)' : 'transparent',
                cursor: status === 'online' ? 'pointer' : 'not-allowed',
                opacity: status === 'online' ? 1 : 0.4,
              }}
            >
              {isRecording ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#f85149] rounded-sm anim-blink-live" style={{ display: 'inline-block' }} />
                  Stop Rec
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Video size={12} />
                  Record
                </span>
              )}
            </button>
            <button
              onClick={onSnapshot}
              disabled={status !== 'online'}
              title={status === 'online' ? "Future: Save to SD Card" : "Camera offline"}
              aria-label={`Snapshot ${label}`}
              className="crimeshield-btn"
              style={{
                padding: '5px 10px',
                fontSize: 11,
                color: status === 'online' ? '#8b949e' : '#484f58',
                border: `1px solid ${status === 'online' ? '#30363d' : '#21262d'}`,
                background: 'transparent',
                cursor: status === 'online' ? 'pointer' : 'not-allowed',
                opacity: status === 'online' ? 1 : 0.4,
              }}
            >
              <Camera size={12} style={{ marginRight: 4 }} /> Snapshot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};