// Types and interfaces for the CrimeShield application

export type DeviceStatus = 'online' | 'offline' | 'connecting';
export type EventType = 'system_start' | 'camera_online' | 'camera_offline' | 'gps_update' | 'emergency_on' | 'emergency_off' | 'cloud_upload';

export interface LogEvent {
  id: string;
  type: EventType;
  icon: string;
  title: string;
  detail: string;
  borderColor: string;
  time: Date;
}

export interface GpsData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  satellites?: number;
  valid?: boolean;
}

export interface Toast {
  id: string;
  borderColor: string;
  bg: string;
  title: string;
  message: string;
}

export interface AppConfig {
  camera1IP: string;
  camera2IP: string;
  esp32IP: string;
  pollingInterval: number;
  audioAlerts: boolean;
  backendUrl: string;
  emergencyContact: string;
}

export interface EvidenceItem {
  id: string;
  created_at: string;
  event_type: string;
  status: string;
  latitude: number;
  longitude: number;
  satellites: number;
  image_url: string;
  reported_by: string;
  notes: string;
  // Fallbacks:
  timestamp?: string;
  imageUrl?: string;
  uploaded?: boolean;
}

export interface CameraCardProps {
  label: 'CAM-01' | 'CAM-02';
  ip: string;
  status: DeviceStatus;
  emergency: boolean;
  onFullscreen: () => void;
  onSnapshot: () => void;
  isRecording: boolean;
  recordingSeconds: number;
  onToggleRecord: () => void;
  isPaused: boolean;
}

export interface ConnStripProps {
  cam1: DeviceStatus;
  cam2: DeviceStatus;
  gps: DeviceStatus;
  controller: DeviceStatus;
}

export interface EmCtrlProps {
  emergency: boolean;
  emergencyDuration: number;
  lastActivated: string | null;
  audioEnabled: boolean;
  esp32IP: string;
  camera1IP: string;
  camera2IP: string;
  cam1Status: DeviceStatus;
  cam2Status: DeviceStatus;
  gpsStatus: DeviceStatus;
  controllerStatus: DeviceStatus;
  onActivate: () => void;
  onClear: () => void;
  onToggleAudio: () => void;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

export interface GpsSectionProps {
  gps: GpsData | null;
  gpsStatus: DeviceStatus;
  emergency: boolean;
  fallbackGps?: { latitude: number; longitude: number } | null;
}

export interface EvidenceLogProps {
  items: EvidenceItem[];
  onCapture: () => void;
  isCapturing: boolean;
}