import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import GlobalStyles from './components/GlobalStyles';
import { Header } from './components/Header';
import { EmergencyBanner } from './components/EmergencyBanner';
import { EmergencyControlCenter } from './components/EmergencyControlCenter';
import { CameraCard } from './components/CameraCard';
import { GpsSection } from './components/GpsSection';
import { EvidenceLog } from './components/EvidenceLog';
import { FullscreenCameraModal } from './components/FullscreenCameraModal';
import { SettingsModal } from './components/SettingsModal';
import { ToastStack } from './components/ToastStack';

import type { AppConfig, GpsData, DeviceStatus, EvidenceItem, LogEvent, Toast } from './types';

import { loadConfig, uid, safeFetch, beep, upscaleImageBlob, makeEvent, fmtDuration } from './utils';
import { io } from 'socket.io-client';
import { EmergencyOverlay } from './components/EmergencyOverlay';


// ============================================================
// GLOBAL KEYFRAMES (moved to GlobalStyles component)
// ============================================================

// ============================================================
// TYPES (moved to types/index.ts)
// ============================================================

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const [emergency, setEmergency] = useState(false);
  const [lastActivated, setLastActivated] = useState<string | null>(null);
  const [emergencyStart, setEmergencyStart] = useState<number | null>(null);
  const [emergencyDuration, setEmergencyDuration] = useState(0);
  const [gps, setGps] = useState<GpsData | null>(null);
  const [cam1Status, setCam1Status] = useState<DeviceStatus>('offline');
  const [cam2Status, setCam2Status] = useState<DeviceStatus>('offline');
  const [gpsStatus, setGpsStatus] = useState<DeviceStatus>('online');
  const [ctrlStatus, setCtrlStatus] = useState<DeviceStatus>('offline');
  const [events, setEvents] = useState<LogEvent[]>([makeEvent('system_start', { detail: 'Console started' })]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState<1 | 2 | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(config.audioAlerts);
  const [demoMode, setDemoMode] = useState(true);
  // Evidence capture state – stores captured images
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [recordingLabel, setRecordingLabel] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const drawIntervalRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const [callInitiated, setCallInitiated] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'initiating' | 'calling' | 'ringing' | 'connected' | 'disconnected' | 'rejected' | 'busy' | 'failed'>('idle');
  const [callTimer, setCallTimer] = useState(0);
  const [callResponder, setCallResponder] = useState<string | null>(null);
  const socketRef = useRef<any>(null);
  const handleEndCallRef = useRef<(() => void) | null>(null);

  const supabaseRef = useRef<SupabaseClient | null>(null);

  // Initialize Supabase client
  useEffect(() => {
    const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;
    if (VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY) {
      try {
        supabaseRef.current = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
      } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
      }
    }
  }, []);

  // Initialize Socket.IO connection to backend call service
  useEffect(() => {
    const socket = io(config.backendUrl);
    socketRef.current = socket;

    socket.on('call_state', (state: { active: boolean; status: typeof callStatus; timer: number; responder?: string | null }) => {
      setCallStatus(state.status);
      setCallTimer(state.timer);
      setCallResponder(state.responder || null);
      if (!state.active && state.status === 'idle') {
        handleEndCallRef.current?.();
      }
    });

    socket.on('call_timer', (timer: number) => {
      setCallTimer(timer);
    });

    return () => {
      socket.disconnect();
    };
  }, [config.backendUrl]);

  // Prevent TS unused variable warning for events
  useEffect(() => {
    if (false as boolean) {
      console.log(events);
    }
  }, [events]);

  const prevCam1 = useRef<DeviceStatus>('offline');
  const prevCam2 = useRef<DeviceStatus>('offline');
  const prevEmerg = useRef(false);
  const prevGpsOk = useRef(true);

  // ── helpers ──────────────────────────────────────────────
  const addEvent = useCallback((type: 'system_start' | 'camera_online' | 'camera_offline' | 'gps_update' | 'emergency_on' | 'emergency_off' | 'cloud_upload', detail: string) => {
    setEvents(p => [makeEvent(type, { detail }), ...p].slice(0, 100));
  }, []);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    setToasts(p => [{ ...t, id: uid() }, ...p].slice(0, 3));
  }, []);

  // ── Emergency duration ticker ─────────────────────────────
  useEffect(() => {
    if (!emergencyStart) { setEmergencyDuration(0); return; }
    const t = setInterval(() => setEmergencyDuration(Math.floor((Date.now() - emergencyStart) / 1000)), 1000);
    return () => clearInterval(t);
  }, [emergencyStart]);

  // ── Emergency handlers ────────────────────────────────────
  const handleActivate = useCallback(() => {
    const now = new Date().toISOString();
    setEmergency(true); setLastActivated(now); setEmergencyStart(Date.now());
    addEvent('emergency_on', `Triggered at ${new Date(now).toLocaleTimeString('en-US', { hour12: false })}`);
    addToast({ borderColor: '#f85149', bg: 'rgba(248,81,73,0.06)', title: 'Emergency Activated', message: 'Emergency alert is now active' });
    if (audioEnabled && config.audioAlerts) beep();
  }, [addEvent, addToast, audioEnabled, config.audioAlerts]);

  const handleClear = useCallback(() => {
    const dur = fmtDuration(emergencyDuration);
    setEmergency(false); setEmergencyStart(null);
    addEvent('emergency_off', `Duration: ${dur}`);
    addToast({ borderColor: '#3fb950', bg: 'rgba(63,185,80,0.06)', title: 'Emergency Cleared', message: 'System returned to normal' });
  }, [addEvent, addToast, emergencyDuration]);

  // ── Polling ───────────────────────────────────────────────
  useEffect(() => {
    let dead = false;
    const poll = async () => {
      if (dead) return;

      // Define helper status checkers for parallel execution
      const checkEmergencyCam1 = async () => {
        try {
          const res = await safeFetch(`http://${config.camera1IP}/emergency/status`);
          const data = await res.json() as { emergency: boolean };
          return { success: true, emergency: data.emergency };
        } catch {
          return { success: false, emergency: false };
        }
      };

      const checkEmergencyCam2 = async () => {
        try {
          const res = await safeFetch(`http://${config.camera2IP}/emergency/status`);
          const data = await res.json() as { emergency: boolean };
          return { success: true, emergency: data.emergency };
        } catch {
          return { success: false, emergency: false };
        }
      };

      const checkEmergencyController = async () => {
        try {
          const res = await safeFetch(`http://${config.esp32IP}/emergency/status`);
          const data = await res.json() as { emergency: boolean };
          return { success: true, emergency: data.emergency, online: true };
        } catch {
          try {
            await safeFetch(`http://${config.esp32IP}/`, 1500, { mode: 'no-cors' });
            return { success: false, emergency: false, online: true };
          } catch {
            return { success: false, emergency: false, online: false };
          }
        }
      };

      const checkGps = async () => {
        try {
          const res = await safeFetch(`http://${config.esp32IP}/gps`);
          if (!res.ok) throw new Error();
          const data = await res.json() as GpsData;
          return { success: true, data };
        } catch {
          return { success: false };
        }
      };

      const checkCam1Online = async () => {
        try {
          await safeFetch(`http://${config.camera1IP}/`, 3000, { mode: 'no-cors' });
          return true;
        } catch {
          return false;
        }
      };

      const checkCam2Online = async () => {
        try {
          await safeFetch(`http://${config.camera2IP}/`, 3000, { mode: 'no-cors' });
          return true;
        } catch {
          return false;
        }
      };

      // Execute all checks simultaneously (parallelized promises)
      const [
        emergCam1,
        emergCam2,
        emergCtrl,
        gpsRes,
        cam1Online,
        cam2Online
      ] = await Promise.all([
        checkEmergencyCam1(),
        checkEmergencyCam2(),
        checkEmergencyController(),
        checkGps(),
        checkCam1Online(),
        checkCam2Online()
      ]);

      if (dead) return;

      // 1. Process Emergency status
      let emergencyActive = false;
      let emergencyChecked = false;

      if (emergCam1.success) {
        if (emergCam1.emergency) emergencyActive = true;
        emergencyChecked = true;
      }
      if (emergCam2.success) {
        if (emergCam2.emergency) emergencyActive = true;
        emergencyChecked = true;
      }
      if (emergCtrl.success) {
        if (emergCtrl.emergency) emergencyActive = true;
        emergencyChecked = true;
      }

      setCtrlStatus(emergCtrl.online ? 'online' : 'offline');

      if (emergencyChecked) {
        if (emergencyActive !== emergency) {
          if (emergencyActive) {
            const now = new Date().toISOString();
            setEmergency(true); setLastActivated(now); setEmergencyStart(Date.now());
            addEvent('emergency_on', `Hardware trigger`);
            addToast({ borderColor: '#f85149', bg: 'rgba(248,81,73,0.06)', title: 'Emergency Activated', message: 'Hardware trigger received' });
            if (audioEnabled && config.audioAlerts) beep();
          } else {
            setEmergency(false); setEmergencyStart(null);
            addEvent('emergency_off', 'Cleared via hardware');
            addToast({ borderColor: '#3fb950', bg: 'rgba(63,185,80,0.06)', title: 'Emergency Cleared', message: 'System returned to normal' });
          }
        }
        prevEmerg.current = emergencyActive;
        setDemoMode(false);
      }

      // 2. Process GPS Status
      if (gpsRes.success && gpsRes.data) {
        const data = gpsRes.data;
        setGps({
          latitude: data.latitude,
          longitude: data.longitude,
          satellites: data.satellites ?? 0,
          valid: data.valid ?? true,
          accuracy: data.accuracy ?? (data.satellites ? Math.max(1.0, +(15.0 / data.satellites).toFixed(1)) : 5.0),
          timestamp: data.timestamp ?? new Date().toISOString(),
        });
        setGpsStatus('online');
        setDemoMode(false);
        if (!prevGpsOk.current) {
          prevGpsOk.current = true;
        }
      } else {
        if (prevGpsOk.current || gpsStatus === 'online') {
          addEvent('gps_update', 'GPS signal not available');
          addToast({ borderColor: '#58a6ff', bg: 'rgba(88,166,255,0.06)', title: 'GPS Unavailable', message: 'GPS signal not available' });
        }
        prevGpsOk.current = false;
        setGpsStatus('offline');
      }

      // 3. Process Camera 1 Status
      if (cam1Online) {
        const s = 'online';
        setCam1Status(s);
        if (s !== prevCam1.current) {
          addEvent('camera_online', `CAM-01 · ${config.camera1IP}`);
          addToast({ borderColor: '#3fb950', bg: 'rgba(63,185,80,0.06)', title: 'Camera Connected', message: 'CAM-01 feed restored' });
          prevCam1.current = s;
        }
      } else {
        setCam1Status('offline');
        if (prevCam1.current !== 'offline') {
          prevCam1.current = 'offline';
          addEvent('camera_offline', `CAM-01 · ${config.camera1IP}`);
        }
      }

      // 4. Process Camera 2 Status
      if (cam2Online) {
        const s = 'online';
        setCam2Status(s);
        if (s !== prevCam2.current) {
          addEvent('camera_online', `CAM-02 · ${config.camera2IP}`);
          addToast({ borderColor: '#3fb950', bg: 'rgba(63,185,80,0.06)', title: 'Camera Connected', message: 'CAM-02 feed restored' });
          prevCam2.current = s;
        }
      } else {
        setCam2Status('offline');
        if (prevCam2.current !== 'offline') {
          prevCam2.current = 'offline';
          addEvent('camera_offline', `CAM-02 · ${config.camera2IP}`);
        }
      }
    };

    poll();
    const iv = setInterval(poll, config.pollingInterval * 1000);
    return () => { dead = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // ── Demo GPS drift ────────────────────────────────────────
  useEffect(() => {
    if (!demoMode) return;
    const t = setInterval(() => {
      setGps(p => {
        if (!p) return p;
        const d = () => (Math.random() - 0.5) * 0.001;
        return { latitude: p.latitude + d(), longitude: p.longitude + d(), accuracy: +(1.5 + Math.random() * 3).toFixed(1), timestamp: new Date().toISOString() };
      });
    }, config.pollingInterval * 1000);
    return () => clearInterval(t);
  }, [demoMode, config.pollingInterval]);

  // Disable demo/simulation mode as soon as any device comes online
  useEffect(() => {
    if (gpsStatus === 'online' || cam1Status === 'online' || cam2Status === 'online' || ctrlStatus === 'online') {
      setDemoMode(false);
    }
  }, [gpsStatus, cam1Status, cam2Status, ctrlStatus]);

  const handleSaveConfig = useCallback((c: AppConfig) => {
    setConfig(c); setAudioEnabled(c.audioAlerts); setDemoMode(true);
  }, []);

  const fetchLatestEvents = useCallback(async () => {
    if (!supabaseRef.current) return;
    try {
      const { data, error } = await supabaseRef.current
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data) {
        setEvidence(data);
      }
    } catch (e) {
      console.error('Failed to fetch events from Supabase:', e);
    }
  }, []);

  // Fetch latest 20 events on dashboard load
  useEffect(() => {
    fetchLatestEvents();
  }, [fetchLatestEvents]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLatestEvents();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchLatestEvents]);

  const handleCaptureEvidence = useCallback(async (explicitIp?: string, explicitLabel?: string) => {
    if (isCapturing) return;
    setIsCapturing(true);

    // 1. Determine which cameras to capture from
    const targets: { label: string; ip: string }[] = [];
    if (explicitIp && explicitLabel) {
      targets.push({ label: explicitLabel, ip: explicitIp });
    } else {
      // Main capture clicked: Capture from all cameras
      targets.push({ label: 'CAM-01', ip: config.camera1IP });
      targets.push({ label: 'CAM-02', ip: config.camera2IP });
    }


    // 2. Fetch GPS coordinates once for all targets
    addToast({ borderColor: '#58a6ff', bg: 'rgba(88,166,255,0.06)', title: 'GPS Sync', message: 'Fetching GPS...' });
    let gpsData = { latitude: config.fallbackLatitude, longitude: config.fallbackLongitude, satellites: 7, valid: true };
    try {
      const gpsResponse = await fetch(`http://${config.esp32IP}/gps`);
      if (gpsResponse.ok) {
        gpsData = await gpsResponse.json();
      }
    } catch (e) {
      console.warn('GPS data fetch failed, using fallback:', e);
      addToast({ borderColor: '#d29922', bg: 'rgba(210,153,34,0.06)', title: 'GPS Sync', message: 'GPS Unavailable' });
      if (gps && gps.latitude !== 0 && gps.longitude !== 0) {
        gpsData = { latitude: gps.latitude, longitude: gps.longitude, satellites: 5, valid: true };
      }
    }

    // 3. Capture and upload for each target in parallel
    const capturePromises = targets.map(async (target) => {
      let imageBlob: Blob | null = null;
      let driveUrl = "";
      let grabbed = false;

      addToast({ borderColor: '#58a6ff', bg: 'rgba(88,166,255,0.06)', title: 'Evidence Capture', message: `Capturing from ${target.label}...` });

      // Try to find active stream img tag in browser DOM first to avoid ESP32-CAM lockout
      const streamImg = (document.getElementById(`camera-img-${target.label}-fullscreen`) ||
                       document.getElementById(`camera-img-${target.label}`)) as HTMLImageElement;

      if (streamImg && streamImg.complete && streamImg.naturalWidth > 0 && streamImg.src) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(streamImg, 0, 0, 640, 480);
            const blobPromise = new Promise<Blob | null>((resolve) => {
              canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
            });
            imageBlob = await blobPromise;
            if (imageBlob) {
              grabbed = true;
              console.log(`Successfully grabbed frame from browser stream element for ${target.label}`);
            }
          }
        } catch (e) {
          console.warn(`Failed to grab frame from browser stream element for ${target.label} (CORS/Security):`, e);
        }
      }

      if (!grabbed) {
        try {
          const imageResponse = await fetch(`http://${target.ip}/capture`);
          if (!imageResponse.ok) throw new Error('Capture request failed');
          const rawBlob = await imageResponse.blob();
          imageBlob = await upscaleImageBlob(rawBlob, 640, 480);
          grabbed = true;
        } catch (e) {
          console.warn(`Capture failed for ${target.label}:`, e);
        }
      }

      if (!imageBlob) {
        // Canvas simulated frame fallback
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, 640, 480);
          ctx.strokeStyle = 'rgba(88, 166, 255, 0.05)'; ctx.lineWidth = 1;
          for (let i = 0; i < 640; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 480); ctx.stroke(); }
          for (let j = 0; j < 480; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(640, j); ctx.stroke(); }
          ctx.strokeStyle = '#f85149'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(320, 240, 30, 0, 2 * Math.PI);
          ctx.moveTo(320, 200); ctx.lineTo(320, 280); ctx.moveTo(280, 240); ctx.lineTo(360, 240); ctx.stroke();
          ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 16px "JetBrains Mono", monospace';
          ctx.fillText(`${target.label} SNAPSHOT`, 20, 40);
          ctx.fillStyle = '#7d8590'; ctx.font = '12px "JetBrains Mono", monospace';
          ctx.fillText(`IP: ${target.ip}`, 20, 60);
          ctx.fillStyle = '#ff7b72'; ctx.fillText(`CORS / NETWORK FALLBACK ACTIVE`, 20, 85);
          ctx.fillStyle = '#e6edf3'; ctx.font = '14px "JetBrains Mono", monospace';
          const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
          ctx.fillText(dateStr, 20, 440);
        }
        const dataUrl = canvas.toDataURL('image/jpeg');
        const res = await fetch(dataUrl);
        imageBlob = await res.blob();
      }

      // Upload to Google Drive
      addToast({ borderColor: '#58a6ff', bg: 'rgba(88,166,255,0.06)', title: 'Cloud Upload', message: `Uploading ${target.label} Image...` });
      try {
        if (!import.meta.env.VITE_APPS_SCRIPT_URL) throw new Error('APPS_SCRIPT_URL is not set');

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(imageBlob);
        const base64Image = await base64Promise;

        const uploadResponse = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL!, {
          method: 'POST',
          body: JSON.stringify({
            image: base64Image,
            filename: `evidence_${target.label}_${Date.now()}.jpg`,
            mimeType: 'image/jpeg'
          })
        });

        if (!uploadResponse.ok) throw new Error('Upload failed');
        const uploadData = await uploadResponse.json() as { url: string };
        if (!uploadData.url) throw new Error('Drive URL missing');
        driveUrl = uploadData.url;
      } catch (e) {
        console.warn(`Google Drive upload failed for ${target.label}:`, e);
        if (!import.meta.env.VITE_APPS_SCRIPT_URL) {
          driveUrl = URL.createObjectURL(imageBlob);
        } else {
          throw e;
        }
      }

      // Save to Supabase
      addToast({ borderColor: '#58a6ff', bg: 'rgba(88,166,255,0.06)', title: 'Database Save', message: `Saving ${target.label} Event...` });
      try {
        if (!supabaseRef.current) throw new Error('Supabase client not initialized');
        const { error } = await supabaseRef.current
          .from('events')
          .insert({
            event_type: "Emergency Evidence",
            status: emergency ? "ACTIVE" : "INACTIVE",
            latitude: gpsData.latitude,
            longitude: gpsData.longitude,
            satellites: gpsData.satellites,
            image_url: driveUrl,
            reported_by: "CrimeShield",
            notes: `Evidence captured from ${target.label}`
          });

        if (error) throw error;
        addToast({ borderColor: '#3fb950', bg: 'rgba(63,185,80,0.06)', title: 'Success', message: `${target.label} Captured Successfully` });
        addEvent('cloud_upload', `${target.label} evidence successfully backed up to cloud`);
      } catch (e) {
        console.warn(`Supabase save failed for ${target.label}:`, e);
        if (!supabaseRef.current) {
          const mockItem: EvidenceItem = {
            id: uid(),
            created_at: new Date().toISOString(),
            event_type: "Emergency Evidence",
            status: emergency ? "ACTIVE" : "INACTIVE",
            latitude: gpsData.latitude,
            longitude: gpsData.longitude,
            satellites: gpsData.satellites,
            image_url: driveUrl,
            reported_by: "CrimeShield",
            notes: `Evidence captured from ${target.label} (Mock)`
          };
          setEvidence(prev => [mockItem, ...prev]);
          addEvent('cloud_upload', `${target.label} evidence captured locally`);
        } else {
          addToast({ borderColor: '#f85149', bg: 'rgba(248,81,73,0.06)', title: 'Database Error', message: `${target.label} Save Failed` });
        }
      }
    });

    try {
      await Promise.all(capturePromises);
    } catch (err) {
      console.error('One or more captures failed:', err);
    } finally {
      await fetchLatestEvents();
      setIsCapturing(false);
    }
  }, [isCapturing, cam1Status, cam2Status, gps, emergency, config, addToast, addEvent, fetchLatestEvents]);

  const handleSnapshot = useCallback(async (label: string) => {
    const camIp = label === 'CAM-01' ? config.camera1IP : config.camera2IP;
    await handleCaptureEvidence(camIp, label);
  }, [handleCaptureEvidence, config.camera1IP, config.camera2IP]);

  // Clean up recording timers on unmount
  useEffect(() => {
    return () => {
      if (drawIntervalRef.current) clearInterval(drawIntervalRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const startRecording = useCallback(async (label: string) => {
    if (recordingLabel) return;
    setRecordingLabel(label);
    setRecordingSeconds(0);
    chunksRef.current = [];

    const imgEl = document.getElementById(`camera-img-${label}`) as HTMLImageElement;
    if (!imgEl) {
      addToast({ borderColor: '#f85149', bg: 'rgba(248,81,73,0.06)', title: 'Record Error', message: 'Stream element not found' });
      setRecordingLabel(null);
      return;
    }

    addToast({ borderColor: '#58a6ff', bg: 'rgba(88,166,255,0.06)', title: 'Recording Started', message: `Recording stream from ${label}...` });

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(10); // 10 FPS
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    } catch (e) {
      recorder = new MediaRecorder(stream);
    }
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
      if (drawIntervalRef.current) clearInterval(drawIntervalRef.current);
      const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
      await handleUploadRecording(videoBlob, label);
    };

    // Draw stream frames upscaled at 10 FPS (100ms interval)
    drawIntervalRef.current = window.setInterval(() => {
      if (imgEl && ctx) {
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, 640, 480);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(imgEl, 0, 0, 640, 480);

        // HUD Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, 640, 35);
        ctx.fillRect(0, 445, 640, 35);

        ctx.fillStyle = '#f85149';
        ctx.beginPath();
        ctx.arc(20, 17, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(`REC ${label.toUpperCase()} (UPSCALED VGA)`, 32, 21);

        const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
        ctx.fillStyle = '#7d8590';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(dateStr, 20, 466);
      }
    }, 100);

    recorder.start();

    recordingTimerRef.current = window.setInterval(() => {
      setRecordingSeconds(s => {
        if (s >= 60) {
          stopRecording();
          return s;
        }
        return s + 1;
      });
    }, 1000);
  }, [recordingLabel, addToast]);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
    setRecordingLabel(null);
  }, []);

  const handleUploadRecording = async (blob: Blob, label: string) => {
    addToast({ borderColor: '#58a6ff', bg: 'rgba(88,166,255,0.06)', title: 'Cloud Upload', message: 'Uploading Recording...' });
    let driveUrl = "";
    let gpsData = { latitude: config.fallbackLatitude, longitude: config.fallbackLongitude, satellites: 7, valid: true };

    try {
      const gpsResponse = await fetch(`http://${config.esp32IP}/gps`);
      if (gpsResponse.ok) {
        const data = await gpsResponse.json();
        gpsData = {
          latitude: data.latitude,
          longitude: data.longitude,
          satellites: data.satellites,
          valid: data.valid
        };
      }
    } catch {
      if (gps && gps.latitude !== 0 && gps.longitude !== 0) {
        gpsData = { latitude: gps.latitude, longitude: gps.longitude, satellites: 5, valid: true };
      }
    }

    try {
      if (!import.meta.env.VITE_APPS_SCRIPT_URL) {
        throw new Error('APPS_SCRIPT_URL not configured');
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Video = await base64Promise;

      const uploadResponse = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL!, {
        method: 'POST',
        body: JSON.stringify({
          image: base64Video,
          filename: `recording_${label}_${Date.now()}.webm`,
          mimeType: 'video/webm'
        })
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');
      const uploadData = await uploadResponse.json() as { url: string };
      if (!uploadData.url) throw new Error('Drive URL missing');
      driveUrl = uploadData.url;
    } catch (e) {
      console.warn('Upload failed, falling back:', e);
      addToast({ borderColor: '#d29922', bg: 'rgba(210,153,34,0.06)', title: 'Upload Warning', message: 'Upload Failed (Mock Used)' });
      driveUrl = URL.createObjectURL(blob);
    }

    addToast({ borderColor: '#58a6ff', bg: 'rgba(88,166,255,0.06)', title: 'Database Save', message: 'Saving Video...' });
    try {
      if (!supabaseRef.current) {
        throw new Error('Supabase client not initialized');
      }
      const { error } = await supabaseRef.current
        .from('events')
        .insert({
          event_type: "Video Recording",
          status: emergency ? "ACTIVE" : "INACTIVE",
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          satellites: gpsData.satellites,
          image_url: driveUrl,
          reported_by: "CrimeShield",
          notes: `Recorded 10-FPS upscaled video stream from ${label}`
        });

      if (error) throw error;
      addToast({ borderColor: '#3fb950', bg: 'rgba(63,185,80,0.06)', title: 'Cloud Upload', message: 'Video Uploaded Successfully' });
    } catch (e) {
      console.warn('Database save failed, writing locally:', e);
      const mockItem: EvidenceItem = {
        id: uid(),
        created_at: new Date().toISOString(),
        event_type: "Video Recording",
        status: emergency ? "ACTIVE" : "INACTIVE",
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        satellites: gpsData.satellites,
        image_url: driveUrl,
        reported_by: "CrimeShield",
        notes: `Recorded upscaled video stream from ${label} (Mock)`
      };
      setEvidence(prev => [mockItem, ...prev]);
    }

    await fetchLatestEvents();
  };

  const handleToggleRecord = useCallback((label: string) => {
    if (recordingLabel === label) {
      stopRecording();
    } else {
      startRecording(label);
    }
  }, [recordingLabel, startRecording, stopRecording]);

  const handleEndCall = useCallback(async () => {
    handleClear();
    try {
      await safeFetch(`http://${config.camera1IP}/emergency/off`, 1500, { mode: 'no-cors' });
      await safeFetch(`http://${config.camera2IP}/emergency/off`, 1500, { mode: 'no-cors' });
      await safeFetch(`http://${config.esp32IP}/emergency/off`, 1500, { mode: 'no-cors' });
    } catch (e) {
      console.warn('Failed to clear emergency states on hardware:', e);
    }
  }, [handleClear, config.camera1IP, config.camera2IP, config.esp32IP]);

  handleEndCallRef.current = handleEndCall;

  // Trigger emergency call on state transition (once per event)
  useEffect(() => {
    if (emergency) {
      if (!callInitiated) {
        setCallInitiated(true);
        const triggerCall = async () => {
          let lat = (gps && gps.latitude !== 0) ? gps.latitude : config.fallbackLatitude;
          let lng = (gps && gps.longitude !== 0) ? gps.longitude : config.fallbackLongitude;
          
          try {
            const gpsRes = await safeFetch(`http://${config.esp32IP}/gps`, 1500);
            if (gpsRes.ok) {
              const gpsData = await gpsRes.json();
              lat = gpsData.latitude;
              lng = gpsData.longitude;
            }
          } catch (e) {
            console.warn('GPS fetch failed for emergency call, using fallback:', e);
          }

          try {
            await fetch(`${config.backendUrl}/api/start-call`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pole: config.poleName,
                latitude: lat,
                longitude: lng
              })
            });
          } catch (err) {
            console.error('Failed to trigger Twilio call on backend:', err);
          }
        };
        triggerCall();
      }
    } else {
      if (callInitiated) {
        setCallInitiated(false);
        // Reset call status and tell backend to end
        fetch(`${config.backendUrl}/api/end-call`, { method: 'POST' }).catch(() => {});
      }
    }
  }, [emergency, callInitiated, config.backendUrl, config.esp32IP]);

  const fallbackGps = (() => {
    const found = evidence.find(
      e => typeof e.latitude === 'number' && typeof e.longitude === 'number' && e.latitude !== 0 && e.longitude !== 0
    );
    return found ? { latitude: found.latitude, longitude: found.longitude } : null;
  })();

  return (
    <>
      <GlobalStyles />
      <div
        className="flex flex-col"
        style={{ height: '100vh', overflow: 'hidden', background: emergency ? '#0d0808' : '#0d1117', transition: 'background 0.5s ease', minWidth: 1280, fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header */}
        <Header emergency={emergency} onSettings={() => setSettingsOpen(true)} />

        {/* Emergency banner */}
        {emergency && <EmergencyBanner />}

        {/* Main grid — fills all remaining height, never scrolls */}
        <main
          style={{
            flex: 1, overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: 10, padding: 10,
          }}
        >
          {/* Section 1: Cameras — two equal cards side by side */}
          <div style={{ display: 'flex', gap: 10, minHeight: 0 }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <CameraCard
                label="CAM-01"
                ip={config.camera1IP}
                status={cam1Status}
                emergency={emergency}
                onFullscreen={() => setFullscreen(1)}
                onSnapshot={() => handleSnapshot('CAM-01')}
                isRecording={recordingLabel === 'CAM-01'}
                recordingSeconds={recordingLabel === 'CAM-01' ? recordingSeconds : 0}
                onToggleRecord={() => handleToggleRecord('CAM-01')}
                isPaused={fullscreen === 1}
              />
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <CameraCard
                label="CAM-02"
                ip={config.camera2IP}
                status={cam2Status}
                emergency={emergency}
                onFullscreen={() => setFullscreen(2)}
                onSnapshot={() => handleSnapshot('CAM-02')}
                isRecording={recordingLabel === 'CAM-02'}
                recordingSeconds={recordingLabel === 'CAM-02' ? recordingSeconds : 0}
                onToggleRecord={() => handleToggleRecord('CAM-02')}
                isPaused={fullscreen === 2}
              />
            </div>
          </div>

          {/* Section 2: Emergency control */}
          <div style={{ minHeight: 0 }}>
            <EmergencyControlCenter
              emergency={emergency} emergencyDuration={emergencyDuration} lastActivated={lastActivated}
              audioEnabled={audioEnabled} esp32IP={config.esp32IP} camera1IP={config.camera1IP} camera2IP={config.camera2IP}
              cam1Status={cam1Status} cam2Status={cam2Status} gpsStatus={gpsStatus} controllerStatus={ctrlStatus}
              onActivate={handleActivate} onClear={handleClear} onToggleAudio={() => setAudioEnabled(p => !p)}
              addToast={addToast}
            />
          </div>

          {/* Section 3: GPS */}
          <div style={{ minHeight: 0 }}>
            <GpsSection
              gps={gps}
              gpsStatus={gpsStatus}
              emergency={emergency}
              fallbackGps={fallbackGps}
              fallbackLatitude={config.fallbackLatitude}
              fallbackLongitude={config.fallbackLongitude}
            />
          </div>

          {/* Section 4: Evidence Log */}
          <div style={{ minHeight: 0 }}>
            <EvidenceLog
              items={evidence}
              onCapture={() => handleCaptureEvidence()}
              isCapturing={isCapturing}
              camerasActive={cam1Status === 'online' || cam2Status === 'online'}
            />
          </div>
        </main>
      </div>

      <ToastStack toasts={toasts} onDismiss={id => setToasts(p => p.filter(t => t.id !== id))} />

      {settingsOpen && <SettingsModal config={config} onSave={handleSaveConfig} onClose={() => setSettingsOpen(false)} />}

      {fullscreen && (
        <FullscreenCameraModal
          label={fullscreen === 1 ? 'CAM-01' : 'CAM-02'}
          ip={fullscreen === 1 ? config.camera1IP : config.camera2IP}
          status={fullscreen === 1 ? cam1Status : cam2Status}
          onClose={() => setFullscreen(null)}
        />
      )}

      {emergency && (
        <EmergencyOverlay
          gps={gps}
          gpsStatus={gpsStatus}
          camera1IP={config.camera1IP}
          camera2IP={config.camera2IP}
          callStatus={callStatus}
          callTimer={callTimer}
          callResponder={callResponder}
          onEndCall={handleEndCall}
          poleName={config.poleName}
        />
      )}
    </>
  );
}