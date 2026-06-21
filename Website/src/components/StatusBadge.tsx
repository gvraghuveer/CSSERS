
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'connecting';
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const map = {
    online: { bg: 'rgba(63,185,80,0.12)', border: 'rgba(63,185,80,0.35)', color: '#3fb950', label: 'Online' },
    offline: { bg: 'rgba(248,81,73,0.12)', border: 'rgba(248,81,73,0.35)', color: '#f85149', label: 'Offline' },
    connecting: { bg: 'rgba(210,153,34,0.12)', border: 'rgba(210,153,34,0.35)', color: '#d29922', label: 'Connecting' },
  };

  const s = map[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium"
      style={{ fontSize: 11, background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontFamily: 'Inter, sans-serif' }}
    >
      <span className="rounded-full" style={{ width: 5, height: 5, background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  );
};