import { useEffect } from 'react';

interface ToastCardProps {
  toast: {
    id: string;
    borderColor: string;
    bg: string;
    title: string;
    message: string;
  };
  onDismiss: (id: string) => void;
}

export const ToastCard = ({ toast, onDismiss }: ToastCardProps) => {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4200);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      className="rounded-xl overflow-hidden anim-fadein relative"
      style={{
        background: '#1c2128',
        border: `1px solid ${toast.borderColor}40`,
        borderLeft: `4px solid ${toast.borderColor}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute top-2.5 right-2.5 text-xs opacity-50 hover:opacity-100 transition-opacity"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#7d8590',
          padding: '4px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 'bold',
          fontSize: '11px',
          zIndex: 10,
          lineHeight: 1
        }}
        aria-label="Close notification"
      >
        ✕
      </button>
      <div className="px-4 py-3 pr-8">
        <div className="font-semibold" style={{ fontSize: 13, color: '#e6edf3', fontFamily: 'Inter, sans-serif' }}>
          {toast.title}
        </div>
        <div style={{ fontSize: 12, color: '#7d8590', marginTop: 3, fontFamily: 'Inter, sans-serif' }}>
          {toast.message}
        </div>
      </div>
    </div>
  );
};