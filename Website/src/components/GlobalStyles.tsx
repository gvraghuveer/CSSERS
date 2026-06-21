
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    @keyframes pulse-red {
      0%, 100% { box-shadow: 0 0 0 0 rgba(248,81,73,0); }
      50%       { box-shadow: 0 0 0 6px rgba(248,81,73,0.2); }
    }
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes blink-live {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.2; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    .anim-pulse-red  { animation: pulse-red 1.8s ease-in-out infinite; }
    .anim-blink-live { animation: blink-live 1.4s ease-in-out infinite; }
    .anim-spin       { animation: spin 0.8s linear infinite; }
    .anim-fadein     { animation: fade-in-up 220ms ease forwards; }

    /* Emergency card throb */
    @keyframes card-throb {
      0%, 100% { box-shadow: 0 0 0 1px #f85149, 0 4px 24px rgba(248,81,73,0.08); }
      50%       { box-shadow: 0 0 0 1px #f85149, 0 4px 36px rgba(248,81,73,0.22); }
    }
    .anim-card-throb { animation: card-throb 2s ease-in-out infinite; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }

    /* Toggle */
    .toggle { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-track {
      position: absolute; inset: 0;
      background: #1c2128; border: 1px solid #30363d;
      border-radius: 22px; cursor: pointer; transition: all 0.2s;
    }
    .toggle-track::before {
      content: ''; position: absolute;
      height: 16px; width: 16px; left: 2px; top: 2px;
      background: #484f58; border-radius: 50%; transition: all 0.2s;
    }
    .toggle input:checked + .toggle-track { background: #0d2318; border-color: #3fb950; }
    .toggle input:checked + .toggle-track::before { transform: translateX(18px); background: #3fb950; }

    /* Map clip */
    .map-clip { border-radius: 8px; overflow: hidden; }

    /* Input */
    .crimeshield-input {
      width: 100%; background: #1c2128; border: 1px solid #30363d;
      border-radius: 8px; color: #e6edf3; padding: 9px 12px;
      font-size: 13px; font-family: 'JetBrains Mono', monospace;
      outline: none; transition: border-color 0.2s, box-shadow 0.2s;
    }
    .crimeshield-input:focus { border-color: #388bfd; box-shadow: 0 0 0 3px rgba(56,139,253,0.15); }

    /* Select */
    .crimeshield-select {
      width: 100%; background: #1c2128; border: 1px solid #30363d;
      border-radius: 8px; color: #e6edf3; padding: 9px 12px;
      font-size: 13px; font-family: 'JetBrains Mono', monospace;
      outline: none; cursor: pointer;
    }

    /* Btn base */
    .crimeshield-btn {
      display: inline-flex; align-items: center; justify-content: center;
      gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px;
      font-weight: 600; cursor: pointer; transition: all 0.18s; border: 1px solid transparent;
      font-family: Inter, sans-serif;
    }
    .crimeshield-btn:disabled { opacity: 0.38; cursor: not-allowed; pointer-events: none; }
    .crimeshield-btn-red  { color: #f85149; border-color: #f85149; background: transparent; }
    .crimeshield-btn-red:hover:not(:disabled)  { background: #f85149; color: #fff; }
    .crimeshield-btn-green { color: #3fb950; border-color: #3fb950; background: transparent; }
    .crimeshield-btn-green:hover:not(:disabled) { background: #3fb950; color: #fff; }
    .crimeshield-btn-ghost { color: #7d8590; border-color: #30363d; background: transparent; }
    .crimeshield-btn-ghost:hover:not(:disabled) { color: #e6edf3; border-color: #484f58; background: #1c2128; }
    .crimeshield-btn-primary { color: #fff; border-color: #238636; background: #238636; }
    .crimeshield-btn-primary:hover:not(:disabled) { background: #2ea043; border-color: #2ea043; }
  `}</style>
);

export default GlobalStyles;