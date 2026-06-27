import { useState, useEffect, useRef } from 'react';

interface GpsSectionProps {
  gps: { latitude: number; longitude: number; accuracy: number; timestamp: string; satellites?: number; valid?: boolean } | null;
  gpsStatus: 'online' | 'offline' | 'connecting';
  emergency: boolean;
  fallbackGps?: { latitude: number; longitude: number } | null;
  fallbackLatitude: number;
  fallbackLongitude: number;
}

export const GpsSection = ({ gps, gpsStatus, emergency, fallbackGps, fallbackLatitude, fallbackLongitude }: GpsSectionProps) => {
  const [secsSince, setSecsSince] = useState(0);
  const [mapKey, setMapKey] = useState(0);
  const prev = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!gps) return;
    const t = setInterval(() => setSecsSince(Math.floor((Date.now() - new Date(gps.timestamp).getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [gps]);

  useEffect(() => {
    const activeLat = gps?.latitude ?? fallbackGps?.latitude;
    const activeLng = gps?.longitude ?? fallbackGps?.longitude;
    if (!activeLat || !activeLng) return;
    const p = prev.current;
    if (!p || Math.abs(activeLat - p.lat) > 0.00005 || Math.abs(activeLng - p.lng) > 0.00005) {
      setMapKey(k => k + 1);
      prev.current = { lat: activeLat, lng: activeLng };
    }
  }, [gps, fallbackGps]);

  const lat = gps?.latitude && gps.latitude !== 0 ? gps.latitude : (fallbackGps?.latitude ?? fallbackLatitude);
  const lng = gps?.longitude && gps.longitude !== 0 ? gps.longitude : (fallbackGps?.longitude ?? fallbackLongitude);
  const d = 0.008;

  return (
    <div
      className={`rounded-xl ${emergency ? 'anim-card-throb' : ''} flex flex-col`}
      style={{
        background: emergency ? '#160c0c' : '#161b22',
        border: `1px solid ${emergency ? '#f85149' : '#21262d'}`,
        boxShadow: emergency ? undefined : '0 1px 3px rgba(0,0,0,0.4)',
        transition: 'background 0.3s, border-color 0.3s',
        height: '100%',
      }}
    >
      {/* Top accent */}
      <div style={{ height: 3, background: 'linear-gradient(90deg,#58a6ff,#79c0ff)', borderRadius: '12px 12px 0 0' }} />
      <div className="p-3 flex flex-col gap-3" style={{ flex: 1, minHeight: 0 }}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: '#7d8590', letterSpacing: '0.1em' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></svg>
          GPS Tracking
        </div>

        <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
          {/* Map */}
          <div className="map-clip" style={{ flex: 1, minHeight: 0, background: '#0d1117', position: 'relative' }}>
            <iframe
              key={mapKey}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-d},${lat-d},${lng+d},${lat+d}&layer=mapnik&marker=${lat},${lng}`}
              title="GPS location"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block', filter: 'invert(0.92) hue-rotate(180deg) saturate(1.1) brightness(0.88)' }}
              loading="lazy"
            />
            {/* Recenter Button */}
            <button
              onClick={() => setMapKey(k => k + 1)}
              className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all duration-200"
              style={{
                background: 'rgba(28, 33, 40, 0.85)',
                borderColor: '#444c56',
                color: '#adbac7',
                backdropFilter: 'blur(4px)',
                cursor: 'pointer',
                zIndex: 10,
                fontFamily: 'Inter, sans-serif'
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#22272e';
                (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#768390';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(28, 33, 40, 0.85)';
                (e.currentTarget as HTMLButtonElement).style.color = '#adbac7';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#444c56';
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
              </svg>
              Recenter
            </button>
          </div>

          {/* Readout panel */}
          <div
            className="flex flex-col gap-0 rounded-xl overflow-hidden"
            style={{ width: 190, border: '1px solid #21262d', background: '#1c2128', flexShrink: 0 }}
          >
            <div className="grid grid-cols-2 gap-px bg-[#21262d]" style={{ borderBottom: '1px solid #21262d' }}>
              {[
                { label: 'Latitude', value: gps ? `${gps.latitude.toFixed(6)}°` : (fallbackGps ? `${fallbackGps.latitude.toFixed(6)}°` : '—') },
                { label: 'Longitude', value: gps ? `${gps.longitude.toFixed(6)}°` : (fallbackGps ? `${fallbackGps.longitude.toFixed(6)}°` : '—') },
                { label: 'Accuracy', value: gps ? `± ${gps.accuracy} m` : '—' },
                { label: 'Updated', value: gps ? (secsSince < 3 ? 'Just now' : `${secsSince}s ago`) : (fallbackGps ? 'From Database' : '—') },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex flex-col gap-0.5 px-2.5 py-2.5"
                  style={{ background: '#1c2128' }}
                >
                  <div style={{ fontSize: 9, color: '#7d8590', fontFamily: 'Inter, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#e6edf3', fontWeight: 500 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Status row */}
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{ borderBottom: '1px solid #21262d', background: '#161b22' }}
            >
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium"
                style={{ fontSize: 11, background: gpsStatus === 'online' ? 'rgba(63,185,80,0.12)' : gpsStatus === 'offline' ? 'rgba(248,81,73,0.12)' : 'rgba(210,153,34,0.12)',
                         border: `1px solid ${gpsStatus === 'online' ? 'rgba(63,185,80,0.35)' : gpsStatus === 'offline' ? 'rgba(248,81,73,0.35)' : 'rgba(210,153,34,0.35)'}`,
                         color: gpsStatus === 'online' ? '#3fb950' : gpsStatus === 'offline' ? '#f85149' : '#d29922', fontFamily: 'Inter, sans-serif' }}>
                <span className="rounded-full" style={{ width: 5, height: 5, background: gpsStatus === 'online' ? '#3fb950' : gpsStatus === 'offline' ? '#f85149' : '#d29922', display: 'inline-block' }} />
                {gpsStatus === 'online' ? 'Online' : gpsStatus === 'offline' ? 'Offline' : 'Connecting'}
              </span>
            </div>

            {/* Google Maps link */}
            <a
              href={`https://maps.google.com/?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 mt-auto"
              style={{
                fontSize: 11, fontWeight: 600, color: '#58a6ff', fontFamily: 'Inter, sans-serif',
                textDecoration: 'none', background: 'rgba(88,166,255,0.06)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(88,166,255,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(88,166,255,0.06)'; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></svg>
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};