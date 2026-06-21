import { Camera, MapPin, Cpu } from 'lucide-react';

interface ConnStripProps {
  cam1: 'online' | 'offline' | 'connecting';
  cam2: 'online' | 'offline' | 'connecting';
  gps: 'online' | 'offline' | 'connecting';
  controller: 'online' | 'offline' | 'connecting';
}

export const ConnStrip = ({ cam1, cam2, gps, controller }: ConnStripProps) => {
  const items = [
    { label: 'CAM-01', status: cam1, icon: <Camera size={12} /> },
    { label: 'CAM-02', status: cam2, icon: <Camera size={12} /> },
    { label: 'GPS', status: gps, icon: <MapPin size={12} /> },
    { label: 'CONTROLLER', status: controller, icon: <Cpu size={12} /> },
  ];

  const colorOf = (s: 'online' | 'offline' | 'connecting') =>
    s === 'online' ? '#3fb950' : s === 'connecting' ? '#d29922' : '#f85149';

  return (
    <div
      className="grid grid-cols-4 gap-px rounded-xl overflow-hidden"
      style={{ border: '1px solid #21262d', background: '#21262d', flexShrink: 0 }}
    >
      {items.map(({ label, status, icon }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-0.5 py-1.5"
          style={{ background: '#161b22' }}
        >
          <div style={{ color: colorOf(status) }}>{icon}</div>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#7d8590', fontFamily: 'Inter, sans-serif', letterSpacing: '0.06em' }}>
            {label}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: colorOf(status) }}>
            {status === 'online' ? 'Online' : status === 'connecting' ? 'Wait…' : 'Offline'}
          </span>
        </div>
      ))}
    </div>
  );
};