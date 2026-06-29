import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

interface HeaderProps {
  emergency: boolean;
  onSettings: () => void;
}

export const Header = ({ emergency, onSettings }: HeaderProps) => {
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtClock = (d: Date) => d.toLocaleTimeString('en-US', { hour12: false });
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <header
      className="shrink-0 flex items-center justify-between px-6"
      style={{
        height: 64,
        background: 'linear-gradient(180deg, #1c2128 0%, #161b22 100%)',
        borderBottom: `1px solid ${emergency ? '#f8514980' : '#30363d'}`,
        boxShadow: emergency
          ? '0 1px 0 rgba(248,81,73,0.2), 0 4px 16px rgba(0,0,0,0.4)'
          : '0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.4)',
        transition: 'border-color 0.4s, box-shadow 0.4s',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* ── LEFT: Brand ── */}
      <div className="flex items-center gap-3">
        {/* Logo Image */}
        <img
          src="/logo.png"
          alt="CrimeShield Logo"
          style={{
            width: 40,
            height: 40,
            objectFit: 'contain',
            borderRadius: '8px',
            border: `1px solid ${emergency ? '#f8514960' : '#30363d'}`,
            padding: '2px',
            background: '#161b22',
            transition: 'border-color 0.4s',
          }}
        />

        <div>
          <div
            className="font-bold leading-none tracking-tight"
            style={{ fontSize: 20, color: '#e6edf3', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}
          >
            CrimeShield
          </div>
          <div style={{ fontSize: 11, color: '#7d8590', marginTop: 3, fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em' }}>
            Smart Emergency Response System
          </div>
        </div>
      </div>

      {/* ── CENTER: Status pill ── */}
      <div
        className={`flex items-center gap-2.5 px-5 py-2 rounded-full font-bold ${emergency ? 'anim-pulse-red' : ''}`}
        style={{
          fontSize: 13,
          background: emergency ? 'rgba(248,81,73,0.12)' : 'rgba(63,185,80,0.10)',
          border: `1px solid ${emergency ? 'rgba(248,81,73,0.5)' : 'rgba(63,185,80,0.4)'}`,
          color: emergency ? '#f85149' : '#3fb950',
          letterSpacing: '0.04em',
          transition: 'all 0.4s',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <span
          className={emergency ? 'anim-blink-live' : ''}
          style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: emergency ? '#f85149' : '#3fb950',
            boxShadow: `0 0 6px ${emergency ? '#f85149' : '#3fb950'}`,
          }}
        />
        {emergency ? '⚠ EMERGENCY ACTIVE' : '● SYSTEM NORMAL'}
      </div>

      {/* ── RIGHT: Clock + Settings ── */}
      <div className="flex items-center gap-5">
        <div className="flex flex-col items-end">
          <div
            className="font-medium tabular-nums leading-none"
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, color: '#e6edf3' }}
          >
            {fmtClock(clock)}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#7d8590', marginTop: 3 }}>
            {fmtDate(clock)}
          </div>
        </div>

        <div style={{ width: 1, height: 32, background: '#21262d' }} />

        <button
          onClick={onSettings}
          aria-label="Open settings"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
          style={{
            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
            color: '#7d8590', border: '1px solid #21262d', background: 'transparent',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#484f58';
            (e.currentTarget as HTMLButtonElement).style.background = '#1c2128';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#7d8590';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#21262d';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
    </header>
  );
};