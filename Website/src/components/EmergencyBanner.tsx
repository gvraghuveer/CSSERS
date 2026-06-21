
export const EmergencyBanner = () => {
  return (
    <div
      role="alert" aria-live="assertive"
      className="shrink-0 flex items-center justify-center gap-3 font-bold text-white"
      style={{
        background: 'linear-gradient(90deg, #b91c1c, #f85149, #b91c1c)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 3s linear infinite',
        height: 44, fontSize: 14, letterSpacing: '0.06em',
        fontFamily: 'Inter, sans-serif',
        boxShadow: '0 2px 12px rgba(248,81,73,0.35)',
      }}
    >
      🚨 &nbsp; EMERGENCY ACTIVE — ALL UNITS RESPOND &nbsp; 🚨
    </div>
  );
};