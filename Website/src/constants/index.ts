import type { AppConfig } from '../types';

export const CONFIG_KEY = 'crimeshield_config';

export const DEMO_BASE = { lat: 12.971598, lng: 77.594566 };

export const DEFAULT_CFG: AppConfig = {
  camera1IP: import.meta.env.VITE_CAMERA1_IP || '10.200.21.145',
  camera2IP: import.meta.env.VITE_CAMERA2_IP || '192.168.1.7',
  esp32IP: import.meta.env.VITE_ESP32_IP || '192.168.1.100',
  pollingInterval: 5,
  audioAlerts: true,
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
  emergencyContact: import.meta.env.VITE_EMERGENCY_CONTACT || '+1234567890'
};

// Polling interval options for settings
export const POLLING_INTERVAL_OPTIONS = [2, 5, 10, 30];

// Camera labels
export const CAMERA_LABELS = ['CAM-01', 'CAM-02'] as const;