import type { AppConfig, EventType, LogEvent } from '../types';
import { CONFIG_KEY, DEFAULT_CFG } from '../constants';

export const uid = () => Math.random().toString(36).slice(2, 9);

export const makeEvent = (type: EventType, overrides: Partial<Pick<LogEvent, 'icon' | 'title' | 'detail' | 'borderColor'>>): LogEvent => {
  const D: Record<EventType, Omit<LogEvent, 'id' | 'time'>> = {
    system_start:   { type, icon: '🟢', title: 'System Initialized',  detail: 'Console started', borderColor: '#3fb950' },
    camera_online:  { type, icon: '📷', title: 'Camera Connected',    detail: '',                 borderColor: '#3fb950' },
    camera_offline: { type, icon: '📷', title: 'Camera Disconnected', detail: '',                 borderColor: '#d29922' },
    gps_update:     { type, icon: '📍', title: 'GPS Updated',         detail: '',                 borderColor: '#58a6ff' },
    emergency_on:   { type, icon: '🚨', title: 'Emergency Activated', detail: '',                 borderColor: '#f85149' },
    emergency_off:  { type, icon: '✅', title: 'Emergency Cleared',   detail: '',                 borderColor: '#3fb950' },
    cloud_upload:   { type, icon: '☁️', title: 'Evidence Uploaded',   detail: '',                 borderColor: '#58a6ff' },
  };
  return { ...D[type], ...overrides, id: uid(), time: new Date() };
};

export const loadConfig = (): AppConfig => {
  try {
    const r = localStorage.getItem(CONFIG_KEY);
    if (r) return { ...DEFAULT_CFG, ...JSON.parse(r) };
  } catch {
    // Ignore parsing errors
  }
  return { ...DEFAULT_CFG };
};

export const saveConfig = (c: AppConfig) => {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
  } catch {
    // Ignore storage errors
  }
};

export const fmtClock = (d: Date) => d.toLocaleTimeString('en-US', { hour12: false });

export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' });

export const fmtDuration = (s: number) => {
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}`;
};

export const safeFetch = async (url: string, ms = 3000, init?: RequestInit) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
};

export const beep = () => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio errors
  }
};

export const upscaleImageBlob = async (blob: Blob, targetWidth = 640, targetHeight = 480): Promise<Blob> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob((resBlob) => {
          resolve(resBlob || blob);
        }, 'image/jpeg', 0.9);
      } else {
        resolve(blob);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
  });
};

export const getGoogleDriveDirectLink = (url: string): string => {
  if (!url) return "";
  if (url.startsWith('blob:') || !url.includes('drive.google.com')) {
    return url;
  }

  let fileId = "";
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1 && match1[1]) {
    fileId = match1[1];
  } else {
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2 && match2[1]) {
      fileId = match2[1];
    }
  }

  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }

  return url;
};