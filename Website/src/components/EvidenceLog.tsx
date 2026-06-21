import { useState, useEffect } from 'react';
import { Video } from 'lucide-react';
import { getGoogleDriveDirectLink } from '../utils';

interface EvidenceLogProps {
  items: {
    id: string;
    created_at: string;
    event_type: string;
    status: string;
    latitude: number;
    longitude: number;
    satellites: number;
    image_url: string;
    reported_by: string;
    notes: string;
    timestamp?: string;
    imageUrl?: string;
    uploaded?: boolean;
  }[];
  onCapture: () => void;
  isCapturing: boolean;
}

const LogThumbnail = ({ url }: { url: string }) => {
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setError(false);
  }, [url]);

  const directUrl = getGoogleDriveDirectLink(url);

  if (error && url && url.includes('drive.google.com')) {
    return (
      <div
        title="Google Drive is processing this image thumbnail. Click to retry."
        onClick={(e) => {
          e.stopPropagation();
          setError(false);
          setRetryCount(r => r + 1);
        }}
        style={{
          width: 52, height: 52,
          background: '#161b22', border: '1px solid #30363d',
          borderRadius: 6, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: '#8b949e', cursor: 'pointer',
          textAlign: 'center', lineHeight: 1.1, flexShrink: 0
        }}
      >
        <span style={{ fontSize: 14 }}>⚙️</span>
        <span style={{ fontSize: 8, marginTop: 2 }}>Syncing...</span>
      </div>
    );
  }

  return (
    <img
      src={retryCount > 0 ? `${directUrl}&retry=${retryCount}` : directUrl}
      alt="evidence thumbnail"
      onError={() => setError(true)}
      style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: '1px solid #21262d', background: '#0d1117', flexShrink: 0 }}
    />
  );
};

const PreviewImage = ({ url }: { url: string }) => {
  const [error, setError] = useState(false);
  const directUrl = getGoogleDriveDirectLink(url);

  if (error && url && url.includes('drive.google.com')) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center" style={{ width: 450, height: 280, background: '#161b22', borderRadius: 8 }}>
        <div className="flex items-center justify-center rounded-full mb-4" style={{ width: 64, height: 64, background: 'rgba(210,153,34,0.1)', border: '1px solid rgba(210,153,34,0.2)', fontSize: 24 }}>
          ⚠️
        </div>
        <div className="font-semibold mb-2" style={{ fontSize: 16, color: '#e6edf3', fontFamily: 'Inter, sans-serif' }}>
          Image Processing
        </div>
        <p style={{ fontSize: 13, color: '#7d8590', marginBottom: 20, fontFamily: 'Inter, sans-serif', maxWidth: 320 }}>
          Google Drive is still processing this image's preview thumbnail. This usually takes 10 to 30 seconds.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setError(false)}
            className="crimeshield-btn crimeshield-btn-ghost"
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            🔄 Retry
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="crimeshield-btn crimeshield-btn-primary text-center"
            style={{ padding: '8px 16px', fontSize: 13, background: '#1f6feb', borderColor: '#1f6feb', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
          >
            📂 Open Original
          </a>
        </div>
      </div>
    );
  }

  return (
    <img
      src={directUrl}
      alt="Evidence Preview"
      onError={() => setError(true)}
      style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block', borderRadius: 8 }}
    />
  );
};

export const EvidenceLog = ({ items, onCapture, isCapturing }: EvidenceLogProps) => {
  const [selectedItem, setSelectedItem] = useState<
    | {
        id: string;
        created_at: string;
        event_type: string;
        status: string;
        latitude: number;
        longitude: number;
        satellites: number;
        image_url: string;
        reported_by: string;
        notes: string;
        timestamp?: string;
        imageUrl?: string;
        uploaded?: boolean;
      }
    | null
  >(null);

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100%' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #21262d' }}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: '#7d8590', letterSpacing: '0.1em' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></svg>
          Evidence Log
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#484f58', marginRight: 8 }}>
            {items.length}
          </span>
          <button
            onClick={onCapture}
            disabled={isCapturing}
            className="crimeshield-btn crimeshield-btn-primary"
            style={{ padding: '6px 12px', fontSize: 11 }}
          >
            {isCapturing ? (
              <span className="flex items-center gap-1.5">
                <span className="anim-spin" style={{ display: 'inline-block', width: 10, height: 10, border: '1.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                Capturing...
              </span>
            ) : (
              '📸 Capture Evidence'
            )}
          </button>
        </div>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: 4 }}>
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-10" style={{ color: '#484f58', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>No evidence yet</div>
        ) : (
          items.map((e) => (
            <div key={e.id} className="flex flex-col gap-1.5 px-4 py-3.5" style={{ borderBottom: '1px solid #21262d' }}>
              <div className="flex items-center gap-3">
                {e.event_type === 'Video Recording' ? (
                  <div style={{ width: 52, height: 52, background: '#1c2128', border: '1px solid #30363d', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff7b72' }}>
                    <Video size={18} />
                  </div>
                ) : e.image_url ? (
                  <LogThumbnail url={e.image_url} />
                ) : (
                  <div style={{ width: 52, height: 52, background: '#161b22', border: '1px solid #21262d', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷</div>
                )}
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e6edf3' }}>
                    {new Date(e.created_at || e.timestamp || '').toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 mt-1" style={{ fontSize: 11, color: '#7d8590', fontFamily: 'JetBrains Mono, monospace' }}>
                    <span>LAT: {e.latitude?.toFixed(6) || '—'}</span>
                    <span>LNG: {e.longitude?.toFixed(6) || '—'}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        background: e.status === 'ACTIVE' ? 'rgba(248,81,73,0.1)' : 'rgba(125,133,144,0.1)',
                        border: `1px solid ${e.status === 'ACTIVE' ? 'rgba(248,81,73,0.2)' : 'rgba(125,133,144,0.2)'}`,
                        color: e.status === 'ACTIVE' ? '#f85149' : '#7d8590'
                      }}
                    >
                      ● {e.status}
                    </span>
                    <span style={{ fontSize: 10, color: '#8b949e', fontFamily: 'Inter, sans-serif' }}>
                      {e.event_type}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => e.image_url && setSelectedItem(e)}
                    className="crimeshield-btn crimeshield-btn-ghost"
                    style={{ padding: '4px 8px', fontSize: 11, width: '100%' }}
                  >
                    View
                  </button>
                  {e.image_url && e.image_url.startsWith('http') && (
                    <a
                      href={e.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="crimeshield-btn crimeshield-btn-primary text-center"
                      style={{ padding: '4px 8px', fontSize: 11, background: '#1f6feb', borderColor: '#1f6feb', color: '#fff', textDecoration: 'none', display: 'inline-block' }}
                    >
                      Open Drive
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', zIndex: 1000 }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative rounded-xl overflow-hidden p-1 max-w-[90vw] max-h-[90vh]"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
            onClick={(evt) => evt.stopPropagation()}
          >
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-2 right-2 flex items-center justify-center rounded-full"
              style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10 }}
            >
              ✕
            </button>
            {selectedItem.event_type === 'Video Recording' ? (
              selectedItem.image_url.startsWith('blob:') ? (
                <video
                  src={selectedItem.image_url}
                  controls
                  autoPlay
                  style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', borderRadius: 8 }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center" style={{ width: 450, height: 280 }}>
                  <div className="flex items-center justify-center rounded-full mb-4" style={{ width: 64, height: 64, background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.2)' }}>
                    <Video size={28} color="#f85149" />
                  </div>
                  <div className="font-semibold mb-2" style={{ fontSize: 16, color: '#e6edf3', fontFamily: 'Inter, sans-serif' }}>
                    Google Drive Video Recording
                  </div>
                  <p style={{ fontSize: 13, color: '#7d8590', marginBottom: 20, fontFamily: 'Inter, sans-serif', maxWidth: 300 }}>
                    Google Drive videos must be played directly in the Google Drive viewer.
                  </p>
                  <a
                    href={selectedItem.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="crimeshield-btn crimeshield-btn-primary text-center"
                    style={{ padding: '8px 16px', fontSize: 13, background: '#1f6feb', borderColor: '#1f6feb', color: '#fff', textDecoration: 'none' }}
                  >
                    ▶️ Open in Google Drive
                  </a>
                </div>
              )
            ) : (
              <PreviewImage url={selectedItem.image_url} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};