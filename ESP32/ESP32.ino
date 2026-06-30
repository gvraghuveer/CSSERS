#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <TinyGPSPlus.h>
#define BUTTON_PIN 13
#define BUZZER_PIN 12
#define LED1_PIN 25
#define LED2_PIN 26
const char* ssid = "A9488";
const char* password = "ilel95898";

// Backend URL
const char* backendServer = "https://crimeshield-backend-4w0n.onrender.com";
unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 20000;  // Heartbeat every 20 seconds

// Cached Camera IPs (initialized with fallbacks)
String camera1CachedIP = "10.200.21.66";
String camera2CachedIP = "10.200.21.145";
unsigned long lastIpSync = 0;
const unsigned long ipSyncInterval = 60000; // Sync every 60 seconds

bool lastButtonState = HIGH;
bool emergencyState = false;
unsigned long lastBackendCheck = 0;
const unsigned long backendCheckInterval = 3000; // Check backend status every 3 seconds during emergency

unsigned long lastToneChange = 0;
bool toneState = false;

TinyGPSPlus gps;
HardwareSerial GPSSerial(2);

WebServer server(80);

double latitude = 0;
double longitude = 0;
int satelliteCount = 0;
bool gpsValid = false;

// ========================================
// BACKGROUND TASK STRUCTURES
// ========================================

struct CamTaskParams {
  String ip;
  String route;
};

struct BackendTaskParams {
  String url;
  double lat;
  double lng;
  bool isActivation;
};

// ========================================
// BACKGROUND TASK FUNCTIONS
// ========================================

void triggerCamTask(void *pvParameters) {
  CamTaskParams* params = (CamTaskParams*)pvParameters;
  if (params->ip && params->ip != "") {
    HTTPClient http;
    String url = "http://" + params->ip + params->route;
    Serial.print("[Task] Triggering camera: ");
    Serial.println(url);
    
    http.begin(url);
    http.setTimeout(2000); // 2 seconds timeout to prevent hanging
    int responseCode = http.GET();
    Serial.print("[Task] Camera response code: ");
    Serial.println(responseCode);
    http.end();
  }
  delete params; // Free memory allocated on heap
  vTaskDelete(NULL); // Delete the task
}

void backendAlertTask(void *pvParameters) {
  BackendTaskParams* params = (BackendTaskParams*)pvParameters;
  HTTPClient http;
  
  if (params->isActivation) {
    String url = params->url + "/api/start-call";
    Serial.print("[Task] Triggering Backend Alert: ");
    Serial.println(url);
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    String payload = "{\"pole\":\"controller-01\",\"latitude\":" + String(params->lat, 6) + ",\"longitude\":" + String(params->lng, 6) + "}";
    int responseCode = http.POST(payload);
    Serial.print("[Task] Backend start-call response: ");
    Serial.println(responseCode);
  } else {
    String url = params->url + "/api/end-call";
    Serial.print("[Task] Clearing Backend Alert: ");
    Serial.println(url);
    
    http.begin(url);
    int responseCode = http.POST("");
    Serial.print("[Task] Backend end-call response: ");
    Serial.println(responseCode);
  }
  
  http.end();
  delete params; // Free memory allocated on heap
  vTaskDelete(NULL); // Delete the task
}

void checkBackendStatusTask(void *pvParameters) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(backendServer) + "/api/call-state";
    http.begin(url);
    http.setTimeout(2000);
    
    int responseCode = http.GET();
    if (responseCode == 200) {
      String response = http.getString();
      if (response.indexOf("\"active\":false") != -1) {
        Serial.println("[Auto-Clear] Backend call is inactive. Clearing emergency state on ESP32.");
        emergencyState = false;
        emergencyOff();
      }
    }
    http.end();
  }
  vTaskDelete(NULL);
}

// ========================================
// REGISTRY IP DISCOVERY
// ========================================

void syncCameraIPs() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(backendServer) + "/api/devices";
    http.begin(url);
    http.setTimeout(3000);
    
    int httpResponseCode = http.GET();
    if (httpResponseCode == 200) {
      String response = http.getString();
      http.end();
      
      // Resolve Camera 1 IP
      int deviceIndex1 = response.indexOf("\"deviceId\":\"camera-01\"");
      if (deviceIndex1 != -1) {
        int ipKeyIndex = response.indexOf("\"ip\":\"", deviceIndex1);
        if (ipKeyIndex != -1) {
          int ipStartIndex = ipKeyIndex + 6;
          int ipEndIndex = response.indexOf("\"", ipStartIndex);
          if (ipEndIndex != -1) {
            camera1CachedIP = response.substring(ipStartIndex, ipEndIndex);
            Serial.print("[Sync] Camera 1 IP cached: ");
            Serial.println(camera1CachedIP);
          }
        }
      }
      
      // Resolve Camera 2 IP
      int deviceIndex2 = response.indexOf("\"deviceId\":\"camera-02\"");
      if (deviceIndex2 != -1) {
        int ipKeyIndex = response.indexOf("\"ip\":\"", deviceIndex2);
        if (ipKeyIndex != -1) {
          int ipStartIndex = ipKeyIndex + 6;
          int ipEndIndex = response.indexOf("\"", ipStartIndex);
          if (ipEndIndex != -1) {
            camera2CachedIP = response.substring(ipStartIndex, ipEndIndex);
            Serial.print("[Sync] Camera 2 IP cached: ");
            Serial.println(camera2CachedIP);
          }
        }
      }
    } else {
      http.end();
      Serial.print("[Sync] Failed to fetch device registry: ");
      Serial.println(httpResponseCode);
    }
  }
}

// Helper task wrapper for background IP sync
void syncIPsTask(void *pvParameters) {
  syncCameraIPs();
  vTaskDelete(NULL);
}

// ========================================
// EMERGENCY ON
// ========================================

void emergencyOn() {
  Serial.println();
  Serial.println("================================");
  Serial.println("EMERGENCY ACTIVATED");
  Serial.println("POLICE SIREN ENABLED");
  Serial.println("================================");

  toneState = false;
  lastToneChange = millis();

  // 1. Trigger Camera 1 (Task A)
  CamTaskParams* cam1Params = new CamTaskParams();
  cam1Params->ip = camera1CachedIP;
  cam1Params->route = "/emergency/on";
  xTaskCreate(triggerCamTask, "Cam1TaskOn", 4096, cam1Params, 1, NULL);

  // 2. Trigger Camera 2 (Task B)
  CamTaskParams* cam2Params = new CamTaskParams();
  cam2Params->ip = camera2CachedIP;
  cam2Params->route = "/emergency/on";
  xTaskCreate(triggerCamTask, "Cam2TaskOn", 4096, cam2Params, 1, NULL);

  // 3. Trigger Backend Alert (Task C)
  BackendTaskParams* backendParams = new BackendTaskParams();
  backendParams->url = String(backendServer);
  backendParams->lat = latitude;
  backendParams->lng = longitude;
  backendParams->isActivation = true;
  xTaskCreate(backendAlertTask, "BackendAlertTask", 4096, backendParams, 1, NULL);
}

// ========================================
// EMERGENCY OFF
// ========================================

void emergencyOff() {
  Serial.println();
  Serial.println("================================");
  Serial.println("EMERGENCY CLEARED");
  Serial.println("ALARM DISABLED");
  Serial.println("================================");

  ledcWriteTone(BUZZER_PIN, 0);

  // 1. Clear Camera 1 (Task A)
  CamTaskParams* cam1Params = new CamTaskParams();
  cam1Params->ip = camera1CachedIP;
  cam1Params->route = "/emergency/off";
  xTaskCreate(triggerCamTask, "Cam1TaskOff", 4096, cam1Params, 1, NULL);

  // 2. Clear Camera 2 (Task B)
  CamTaskParams* cam2Params = new CamTaskParams();
  cam2Params->ip = camera2CachedIP;
  cam2Params->route = "/emergency/off";
  xTaskCreate(triggerCamTask, "Cam2TaskOff", 4096, cam2Params, 1, NULL);

  // 3. Clear Backend Alert (Task C)
  BackendTaskParams* backendParams = new BackendTaskParams();
  backendParams->url = String(backendServer);
  backendParams->lat = latitude;
  backendParams->lng = longitude;
  backendParams->isActivation = false;
  xTaskCreate(backendAlertTask, "BackendClearTask", 4096, backendParams, 1, NULL);
}

// ========================================
// GPS
// ========================================

void handleGPS() {
  String json = "{";

  json += "\"latitude\":" + String(latitude, 6) + ",";

  json += "\"longitude\":" + String(longitude, 6) + ",";

  json += "\"satellites\":" + String(satelliteCount) + ",";

  json += "\"valid\":";
  json += gpsValid ? "true" : "false";

  json += "}";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(
    200,
    "application/json",
    json);
}

void handleEmergencyStatus() {
  String json =
    "{\"emergency\":";

  json += emergencyState
            ? "true"
            : "false";

  json += "}";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(
    200,
    "application/json",
    json);
}

void handleEmergencyOn() {
  if (!emergencyState) {
    emergencyState = true;
    emergencyOn();
  }

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(
    200,
    "text/plain",
    "Emergency ON");
}

void handleEmergencyOff() {
  if (emergencyState) {
    emergencyState = false;
    emergencyOff();
  }

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(
    200,
    "text/plain",
    "Emergency OFF");
}

// ========================================
// DEVICE REGISTRY HELPERS
// ========================================
void registerDevice() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(backendServer) + "/api/device/register");
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"deviceId\":\"controller-01\",\"deviceType\":\"controller\",\"mac\":\"" + WiFi.macAddress() + "\",\"ip\":\"" + WiFi.localIP().toString() + "\"}";

    int httpResponseCode = http.POST(payload);
    Serial.print("[Registry] Register code: ");
    Serial.println(httpResponseCode);
    http.end();
  }
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(backendServer) + "/api/device/heartbeat");
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"deviceId\":\"controller-01\",\"ip\":\"" + WiFi.localIP().toString() + "\"}";

    int httpResponseCode = http.POST(payload);
    Serial.print("[Registry] Heartbeat code: ");
    Serial.println(httpResponseCode);
    http.end();
  }
}


// ========================================
// SETUP
// ========================================

void setup() {
  Serial.begin(115200);

  pinMode(
    BUTTON_PIN,
    INPUT_PULLUP);

  pinMode(LED1_PIN, OUTPUT);
  digitalWrite(LED1_PIN, HIGH);

  pinMode(LED2_PIN, OUTPUT);
  digitalWrite(LED2_PIN, HIGH);

  ledcAttach(
    BUZZER_PIN,
    2000,
    8);

  WiFi.begin(
    ssid,
    password);

  Serial.print(
    "Connecting to WiFi");

  while (
    WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected");
  Serial.println("Emergency System Ready");

  Serial.print("ESP32 IP: ");
  Serial.println(
    WiFi.localIP());

  registerDevice();
  syncCameraIPs();

  GPSSerial.begin(
    9600,
    SERIAL_8N1,
    16,
    17);

  server.on(
    "/gps",
    handleGPS);

  server.on(
    "/emergency/status",
    handleEmergencyStatus);

  server.on(
    "/emergency/on",
    handleEmergencyOn);

  server.on(
    "/emergency/off",
    handleEmergencyOff);

  server.begin();

  Serial.println(
    "Web Server Started");
}

// ========================================
// LOOP
// ========================================

void loop() {

  while (GPSSerial.available()) {
    gps.encode(
      GPSSerial.read());
  }

  if (gps.location.isValid()) {
    latitude =
      gps.location.lat();

    longitude =
      gps.location.lng();

    gpsValid = true;
  }

  if (gps.satellites.isValid()) {
    satelliteCount =
      gps.satellites.value();
  }

  bool currentButtonState =
    digitalRead(BUTTON_PIN);

  if (
    lastButtonState == HIGH && currentButtonState == LOW) {
    emergencyState =
      !emergencyState;

    Serial.print(
      "Emergency State: ");

    Serial.println(
      emergencyState
        ? "ON"
        : "OFF");

    if (emergencyState) {
      emergencyOn();
    } else {
      emergencyOff();
    }

    delay(300);
  }

  lastButtonState =
    currentButtonState;

  // ====================================
  // POLICE SIREN
  // ====================================

  if (emergencyState) {
    if (millis() - lastToneChange > 250) {
      lastToneChange = millis();

      toneState = !toneState;

      if (toneState) {
        ledcWriteTone(BUZZER_PIN, 1500);
      } else {
        ledcWriteTone(BUZZER_PIN, 3000);
      }
    }
  }

  // Check backend emergency status periodically during emergency (for self-clearing)
  if (emergencyState && (millis() - lastBackendCheck > backendCheckInterval)) {
    lastBackendCheck = millis();
    xTaskCreate(checkBackendStatusTask, "CheckBackendTask", 4096, NULL, 1, NULL);
  }

  // Heartbeat trigger
  if (millis() - lastHeartbeat > heartbeatInterval) {
    lastHeartbeat = millis();
    sendHeartbeat();
  }

  // Background camera IP sync from backend registry (every 60 seconds)
  if (millis() - lastIpSync > ipSyncInterval) {
    lastIpSync = millis();
    xTaskCreate(syncIPsTask, "SyncIPsTask", 4096, NULL, 1, NULL);
  }

  server.handleClient();
}
