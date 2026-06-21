# CrimeShield - Smart Emergency Response System

An integrated IoT security solution that coordinates hardware triggers, sensor readouts, real-time GPS tracking, and dual-camera video feeds. When an emergency is triggered, the system sounds sirens, flashes strobe lights, captures high-resolution evidence snapshots, and automatically backs up data and video recordings to Supabase and Google Drive.

---

## 🚀 Key Features

* **Dual-Camera Live Streaming:** Real-time MJPEG video feeds from two ESP32-CAM modules directly on the dashboard.
* **Warning Systems:** Police siren buzzer connected to the main ESP32 and flashing white LED strobe lights on the ESP32-CAMs.
* **Real-Time GPS Tracking:** Displays live coordinates, accuracy, and satellite count on an interactive map.
* **Automated Voice Calls & SMS Alert:** Triggers outbound phone calls to emergency services using Twilio and sends a text message with a Google Maps location link.
* **Automatic Dashboard Reset:** Integrates Twilio webhooks with Socket.IO to close the overlay and clear warning lights automatically when the call hangs up.
* **Database GPS Fallback:** If the physical GPS module goes offline, the dashboard automatically falls back to showing the last-saved coordinates fetched from the database.
* **Cloud Backup & Evidence Logging:** Automatically logs emergency events, GPS data, snapshots, and video recordings to a Supabase database, and uploads media files to Google Drive.

---

## 📂 Repository Structure

```text
├── Backend/                # Outbound Calling & SMS Server
│   ├── server.js           # Node.js server (Express + Socket.IO + Twilio)
│   ├── package.json        
│   └── .env                # Twilio credentials & configuration
│
├── Camera-1/               # ESP32-CAM firmware
│   └── CameraWebServer/    
│       ├── CameraWebServer.ino   # Main camera sketch
│       └── app_httpd.cpp         # Camera web server endpoints (CORS enabled)
│
├── ESP32/                  # ESP32 Main Controller firmware
│   └── ESP32.ino           # Siren, Buzzer, Button, GPS serial parsing (CORS enabled)
│
├── Website/                # Dashboard Frontend (Vite + React)
│   ├── src/                # React components, styles, & hooks
│   ├── public/             # Static assets
│   ├── package.json        
│   └── vite.config.ts      
│
└── README.md               # Project documentation
```

---

## ⚙️ Configuration

### 1. Web Dashboard (`Website/.env`)
Create a `.env` file inside the `Website` directory with your cloud credentials:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_APPS_SCRIPT_URL=your-google-apps-script-deployment-url
```

*Note: The frontend configures the device IP addresses (ESP32 and ESP32-CAMs) inside the dashboard's settings panel, which is stored in local storage.*

### 2. Calling & SMS Backend (`Backend/.env`)
Create a `.env` file inside the `Backend` directory with your Twilio credentials and forwarding URL:

```env
PORT=3001
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
EMERGENCY_CONTACT=your-recipient-phone-number
PUBLIC_URL=your-ngrok-or-public-domain-url
```

### 3. Microcontrollers (Arduino C++)
To connect your hardware to the local network and each other, update the following configurations:

* **Main Controller ([ESP32.ino](file:///d:/Codes/IoT%20Project/CrimeShield%20-%20Smart%20Emergency%20Response%20System/ESP32/ESP32.ino)):**
  * Lines 9–10: Update the Wi-Fi credentials (`ssid` and `password`).
  * Lines 12–13: Update `CAMERA_1_IP` and `CAMERA_2_IP` with the IP addresses of your camera modules.
* **Camera Modules ([CameraWebServer.ino](file:///d:/Codes/IoT%20Project/CrimeShield%20-%20Smart%20Emergency%20Response%20System/Camera-1/CameraWebServer/CameraWebServer.ino)):**
  * Lines 12–13: Update the Wi-Fi credentials (`ssid` and `password`).

---

## 🛠️ Setup & Installation

### 1. Hardware Firmware Flashing
Using the **Arduino IDE**, upload the respective code to your microcontrollers:

* **Main Controller:** Open [ESP32/ESP32.ino](file:///d:/Codes/IoT%20Project/CrimeShield%20-%20Smart%20Emergency%20Response%20System/ESP32/ESP32.ino) and upload it to your ESP32 board.
* **Camera Modules:** Open [Camera-1/CameraWebServer/CameraWebServer.ino](file:///d:/Codes/IoT%20Project/CrimeShield%20-%20Smart%20Emergency%20Response%20System/Camera-1/CameraWebServer/CameraWebServer.ino) and upload it to **both** of your ESP32-CAM boards.
  * *Update the Wi-Fi credentials (`ssid` and `password`) inside both `.ino` files before uploading.*

### 2. Running the Web Dashboard
Navigate to the `Website` folder, install the dependencies, and start the development server:

```bash
cd Website
npm install
npm run dev
```

The dashboard will start running at `http://localhost:5173`. Open it in your browser, click the settings icon, and input the local IP addresses assigned to your ESP32 devices by your Wi-Fi router.

### 3. Running the Calling Backend
Navigate to the `Backend` folder, install dependencies, and start the backend server:

```bash
cd Backend
npm install
npm run dev
```

*Note: If you want the dashboard overlay to close automatically when you hang up the call, run `ngrok http 3001` in another window, and paste the generated HTTPS URL as `PUBLIC_URL` in `Backend/.env` before starting the server.*

---

## 📡 API Endpoints (CORS Enabled)

### ESP32 Main Controller (`10.200.21.100`)
* `GET /gps` — Returns JSON object with `latitude`, `longitude`, `satellites`, and `valid` flags.
* `GET /emergency/status` — Returns emergency activation state `{"emergency": true/false}`.
* `GET /emergency/on` — Activates the hardware siren alarm.
* `GET /emergency/off` — Disables the hardware siren alarm.

### ESP32-CAM Modules (`10.200.21.66` & `10.200.21.145`)
* `GET /capture` — Captures and returns a single JPEG image frame.
* `GET :81/stream` — Initiates the live MJPEG video stream (on port 81).
* `GET /emergency/on` — Starts the flashing warning strobe light.
* `GET /emergency/off` — Stops the flashing warning strobe light.
* `GET /flash/on` — Turns the onboard flash LED on solid.
* `GET /flash/off` — Turns the onboard flash LED off.

### Calling & SMS Backend (`http://localhost:3001`)
* `POST /api/start-call` — Triggers an outbound Twilio call and sends the GPS coordinates via SMS.
* `POST /api/end-call` — Ends the active emergency call state.
* `POST /api/twilio/call-status` — Receives call progress webhook updates from Twilio (ringing, connected, completed) to sync the frontend dashboard.
* `POST /api/twilio/gather-input` — Receives interactive DTMF keypad responses from Twilio.
