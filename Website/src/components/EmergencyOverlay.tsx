import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  PhoneOff, 
  MapPin, 
  ShieldAlert, 
  Satellite, 
  Clock, 
  VideoOff, 
  Activity 
} from 'lucide-react';

interface EmergencyOverlayProps {
  gps: { latitude: number; longitude: number; accuracy: number; timestamp: string; satellites?: number; valid?: boolean } | null;
  gpsStatus: 'online' | 'offline' | 'connecting';
  camera1IP: string;
  camera2IP: string;
  emergencyContact: string;
  callStatus: 'idle' | 'initiating' | 'calling' | 'ringing' | 'connected' | 'disconnected' | 'rejected' | 'busy' | 'failed';
  callTimer: number;
  callResponder?: string | null;
  onEndCall: () => void;
  poleName: string;
}

export const EmergencyOverlay = ({
  gps,
  gpsStatus,
  camera1IP,
  camera2IP,
  emergencyContact,
  callStatus,
  callTimer,
  callResponder,
  onEndCall,
  poleName
}: EmergencyOverlayProps) => {
  const [cam1Error, setCam1Error] = useState(false);
  const [cam2Error, setCam2Error] = useState(false);
  const [sequenceStep, setSequenceStep] = useState(0);

  // Auto-close overlay if call is rejected, busy, or failed after 5 seconds
  useEffect(() => {
    if (callStatus === 'rejected' || callStatus === 'busy' || callStatus === 'failed') {
      const timer = setTimeout(() => {
        onEndCall();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [callStatus, onEndCall]);

  // Local step sequencer to show the initial check flow nicely
  useEffect(() => {
    if (callStatus === 'idle') {
      setSequenceStep(0);
      return;
    }
    
    // Animate the flow sequence:
    // Step 0: Emergency Detected
    // Step 1: Collecting GPS... (1s)
    // Step 2: Preparing Emergency Call... (2s)
    // Step 3: Calling Emergency Contact... (triggered when backend enters 'calling'/'ringing')
    // Step 4: Connected (triggered when backend enters 'connected')
    
    if (sequenceStep < 2) {
      const timer = setTimeout(() => {
        setSequenceStep(prev => prev + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [callStatus, sequenceStep]);

  // Sync sequenceStep with backend status
  useEffect(() => {
    if (callStatus === 'calling' || callStatus === 'ringing') {
      setSequenceStep(3);
    } else if (callStatus === 'connected') {
      setSequenceStep(4);
    } else if (callStatus === 'disconnected' || callStatus === 'idle') {
      setSequenceStep(0);
    }
  }, [callStatus]);

  const getSequenceLabel = () => {
    if (callStatus === 'rejected') return 'Call Rejected / Declined';
    if (callStatus === 'busy') return 'Line Busy / Rejected';
    if (callStatus === 'failed') return 'Call Connection Failed';

    switch (sequenceStep) {
      case 0: return 'Emergency Detected';
      case 1: return 'Collecting GPS Data...';
      case 2: return 'Preparing Call Stream...';
      case 3: return callStatus === 'ringing' ? 'Ringing Responders...' : 'Calling Responders...';
      case 4: return callResponder ? `Connected: ${callResponder}` : 'Call Connected';
      default: return 'Emergency Calling Active';
    }
  };

  const getProgressBarWidth = () => {
    if (callStatus === 'rejected' || callStatus === 'busy' || callStatus === 'failed') return '100%';
    return `${(sequenceStep / 4) * 100}%`;
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 overflow-hidden"
      style={{
        background: 'radial-gradient(circle, rgba(20,5,5,0.95) 0%, rgba(10,3,3,0.99) 100%)',
        border: '4px solid rgba(248, 81, 73, 0.45)',
        boxShadow: 'inset 0 0 80px rgba(248, 81, 73, 0.25)',
      }}
    >
      {/* Alert Border Animation */}
      <div className="absolute inset-0 pointer-events-none anim-border-pulse" />

      {/* Top Banner Row */}
      <div className="w-full flex items-center justify-between z-10 border-b border-[#f8514940] pb-4 bg-gradient-to-b from-black/40 to-transparent p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#f8514920] border border-[#f85149] rounded-lg animate-pulse">
            <ShieldAlert className="w-6 height-6 text-[#f85149]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#e6edf3] tracking-wider uppercase font-mono">
              CRIMESHIELD DISPATCH CENTER
            </h1>
            <p className="text-xs text-[#7d8590] tracking-wide">
              SMART EMERGENCY RESPONSE OVERLAY
            </p>
          </div>
        </div>

        {/* Flashing Live Badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 bg-[#f8514915] border border-[#f8514980] rounded-full text-[#f85149] font-bold text-xs uppercase tracking-wider animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f85149] shadow-[0_0_8px_#f85149]" />
          Emergency Active
        </div>
      </div>

      {/* Central Screen Grid */}
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 z-10 overflow-hidden items-stretch">
        
        {/* Left Side: Calling UI Card (Glassmorphism) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl border border-white/10 backdrop-blur-xl bg-black/40 shadow-2xl relative overflow-hidden">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

          {/* Header section in card */}
          <div className="flex flex-col items-center text-center mt-2">
            <div className="text-[10px] uppercase font-bold text-[#7d8590] tracking-widest mb-1">
              Outgoing Voice Connection
            </div>
            <h2 className="text-lg font-bold text-[#e6edf3]">
              {callResponder ? `Active Responded Unit: ${callResponder}` : 'Ambulance · Police · Control Room'}
            </h2>
            
            {/* Status indicator badge */}
            <div className="mt-3 text-xs font-mono uppercase tracking-widest text-[#58a6ff]">
              {getSequenceLabel()}
            </div>
          </div>

          {/* Central Call Wave & Pulsing Area */}
          <div className="flex flex-col items-center justify-center py-6">
            <AnimatePresence mode="wait">
              {callStatus === 'rejected' || callStatus === 'busy' || callStatus === 'failed' ? (
                // Rejected / Failed state: Warning pulser
                <motion.div
                  key="call-failed-pulser"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative flex items-center justify-center w-28 h-28"
                >
                  <motion.div
                    animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full border-2 border-[#f85149] pointer-events-none"
                  />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f85149]/20 to-[#f85149]/40 border border-[#f85149] flex items-center justify-center shadow-[0_0_25px_rgba(248,81,73,0.25)]">
                    <PhoneOff className="w-6 h-6 text-[#f85149]" />
                  </div>
                </motion.div>
              ) : sequenceStep === 4 ? (
                // Connected state: Voice Waveform
                <motion.div 
                  key="connected-waveform"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1.5 h-24"
                >
                  {[0.4, 0.9, 0.5, 0.8, 0.3, 0.7, 0.4, 0.9, 0.6, 0.8, 0.5].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: [20, h * 90, 20],
                      }}
                      transition={{
                        duration: 1.1 + (i % 3) * 0.15,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="w-1.5 rounded-full"
                      style={{
                        background: 'linear-gradient(180deg, #f85149 0%, #ff7b72 100%)',
                        boxShadow: '0 0 10px rgba(248,81,73,0.3)',
                      }}
                    />
                  ))}
                </motion.div>
              ) : (
                // Calling / Ringing Pulsing Ring Animation
                <motion.div 
                  key="calling-pulser"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative flex items-center justify-center w-28 h-28"
                >
                  <motion.div
                    animate={{ scale: [1, 2.1], opacity: [0.6, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full border-2 border-[#f85149] pointer-events-none"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
                    transition={{ duration: 2, delay: 0.6, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full border-2 border-[#ff7b72] pointer-events-none"
                  />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f85149] to-[#ff7b72] flex items-center justify-center shadow-[0_0_25px_rgba(248,81,73,0.45)]">
                    <Phone className="w-7 h-7 text-white animate-bounce" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Call duration timer */}
            {sequenceStep === 4 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 font-mono text-2xl font-bold tracking-widest text-[#e6edf3]"
              >
                {formatTimer(callTimer)}
              </motion.div>
            )}
          </div>

          {/* Flow Progress Bar */}
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mb-6">
            <div 
              className={`h-full transition-all duration-500 ease-out ${
                callStatus === 'rejected' || callStatus === 'busy' || callStatus === 'failed'
                  ? 'bg-[#f85149]'
                  : 'bg-gradient-to-r from-[#f85149] to-[#ff7b72]'
              }`} 
              style={{ width: getProgressBarWidth() }}
            />
          </div>

          {/* Call action buttons */}
          <div className="flex items-center justify-center gap-6">
            {/* End Call Button */}
            <button
              onClick={onEndCall}
              className="px-6 py-3.5 rounded-full bg-[#f85149] hover:bg-[#ea3939] text-white font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(248,81,73,0.35)] transition-all duration-200 hover:scale-105"
            >
              <PhoneOff className="w-5 h-5" />
              Disconnect
            </button>
          </div>

        </div>

        {/* Right Side: Camera Feeds & GPS Stats */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Cameras Grid */}
          <div className="grid grid-cols-2 gap-4 flex-1 min-height-0">
            {/* Camera 1 Stream */}
            <div className="relative rounded-2xl border border-white/10 bg-black/40 overflow-hidden flex flex-col items-stretch">
              <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded bg-black/60 border border-white/10 text-[10px] font-mono font-bold text-white flex items-center gap-1.5 uppercase">
                <span className={`w-1.5 h-1.5 rounded-full ${cam1Error ? 'bg-[#f85149]' : 'bg-[#3fb950]'}`} />
                CAM-01
              </div>
              
              <div className="flex-1 flex items-center justify-center relative min-h-0 bg-[#060608]">
                {cam1Error ? (
                  <div className="flex flex-col items-center justify-center text-[#7d8590] gap-2 p-4">
                    <VideoOff className="w-10 h-10 text-[#f85149]" />
                    <span className="text-xs uppercase font-mono tracking-widest text-[#f85149]">Camera Offline</span>
                    <span className="text-[9px] text-[#7d8590] font-mono">{camera1IP}</span>
                  </div>
                ) : (
                  <img
                    src={`http://${camera1IP}:81/stream`}
                    alt="Camera 1 Stream"
                    onError={() => setCam1Error(true)}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Camera 2 Stream */}
            <div className="relative rounded-2xl border border-white/10 bg-black/40 overflow-hidden flex flex-col items-stretch">
              <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded bg-black/60 border border-white/10 text-[10px] font-mono font-bold text-white flex items-center gap-1.5 uppercase">
                <span className={`w-1.5 h-1.5 rounded-full ${cam2Error ? 'bg-[#f85149]' : 'bg-[#3fb950]'}`} />
                CAM-02
              </div>

              <div className="flex-1 flex items-center justify-center relative min-h-0 bg-[#060608]">
                {cam2Error ? (
                  <div className="flex flex-col items-center justify-center text-[#7d8590] gap-2 p-4">
                    <VideoOff className="w-10 h-10 text-[#f85149]" />
                    <span className="text-xs uppercase font-mono tracking-widest text-[#f85149]">Camera Offline</span>
                    <span className="text-[9px] text-[#7d8590] font-mono">{camera2IP}</span>
                  </div>
                ) : (
                  <img
                    src={`http://${camera2IP}:81/stream`}
                    alt="Camera 2 Stream"
                    onError={() => setCam2Error(true)}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Coordinates & Status Readout Card (Glassmorphism) */}
          <div className="p-4 rounded-xl border border-white/10 bg-black/40 grid grid-cols-2 sm:grid-cols-4 gap-4 backdrop-blur-md">
            {/* Latitude */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#58a6ff]/10 border border-[#58a6ff]/20 rounded-lg text-[#58a6ff]">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[9px] text-[#7d8590] uppercase tracking-wider">Latitude</div>
                <div className="font-mono text-xs font-bold text-[#e6edf3]">
                  {gps ? `${gps.latitude.toFixed(6)}°` : '—'}
                </div>
              </div>
            </div>

            {/* Longitude */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#58a6ff]/10 border border-[#58a6ff]/20 rounded-lg text-[#58a6ff]">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[9px] text-[#7d8590] uppercase tracking-wider">Longitude</div>
                <div className="font-mono text-xs font-bold text-[#e6edf3]">
                  {gps ? `${gps.longitude.toFixed(6)}°` : '—'}
                </div>
              </div>
            </div>

            {/* Satellites */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3fb950]/10 border border-[#3fb950]/20 rounded-lg text-[#3fb950]">
                <Satellite className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[9px] text-[#7d8590] uppercase tracking-wider">GPS Coverage</div>
                <div className="font-mono text-xs font-bold text-[#e6edf3] flex items-center gap-1">
                  {gps?.satellites ?? 0} Sats
                  <span className="text-[9px] text-[#7d8590]">
                    ({gpsStatus})
                  </span>
                </div>
              </div>
            </div>

            {/* Time Stamp */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#d29922]/10 border border-[#d29922]/20 rounded-lg text-[#d29922]">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[9px] text-[#7d8590] uppercase tracking-wider">Timestamp</div>
                <div className="font-mono text-[10px] font-bold text-[#e6edf3] whitespace-nowrap">
                  {gps ? new Date(gps.timestamp).toLocaleTimeString() : '—'}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Footer Diagnostic Panel */}
      <div className="w-full flex flex-wrap gap-6 items-center justify-between border-t border-white/5 pt-4 text-xs font-mono text-[#7d8590] bg-black/10 p-3 rounded-lg backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
            Pole: <span className="text-white">{poleName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
            Controller Status: <span className="text-white uppercase">{gpsStatus}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
            Line Signal: <span className="text-white">100% SECURE</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#58a6ff] animate-pulse" />
          SYSTEM DIAGNOSTICS: NORMAL
        </div>
      </div>
    </motion.div>
  );
};
