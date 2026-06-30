#include <Arduino.h>
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

bool emergencyMode = false;
bool flashState = false;
unsigned long lastFlash = 0;

// Registry Config
const char* backendServer = "https://crimeshield-backend-4w0n.onrender.com";
unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 20000; // Heartbeat every 20 seconds

// ========================================
// WIFI SETTINGS
// ========================================

const char *ssid = "A9488";
const char *password = "ilel95898";

// ========================================
// FUNCTION DECLARATIONS
// ========================================

void startCameraServer();

// ========================================
// DEVICE REGISTRY HELPERS
// ========================================
void registerDevice() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(backendServer) + "/api/device/register");
    http.addHeader("Content-Type", "application/json");
    
    // Sends JSON with camera-01 deviceId and local IP
    String payload = "{\"deviceId\":\"camera-02\",\"deviceType\":\"camera\",\"mac\":\"" + WiFi.macAddress() + "\",\"ip\":\"" + WiFi.localIP().toString() + "\"}";
    
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
    
    String payload = "{\"deviceId\":\"camera-02\",\"ip\":\"" + WiFi.localIP().toString() + "\"}";
    
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
  Serial.setDebugOutput(true);

  Serial.println();

  pinMode(4, OUTPUT);
  digitalWrite(4, LOW);

  camera_config_t config;

  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;

  config.pin_pwdn = 32;
  config.pin_reset = -1;

  config.pin_xclk = 0;

  config.pin_sccb_sda = 26;
  config.pin_sccb_scl = 27;

  config.pin_d7 = 35;
  config.pin_d6 = 34;
  config.pin_d5 = 39;
  config.pin_d4 = 36;
  config.pin_d3 = 21;
  config.pin_d2 = 19;
  config.pin_d1 = 18;
  config.pin_d0 = 5;

  config.pin_vsync = 25;
  config.pin_href = 23;
  config.pin_pclk = 22;

  config.xclk_freq_hz = 8000000;

  config.frame_size = FRAMESIZE_QQVGA;

  config.pixel_format = PIXFORMAT_RGB565;

  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;

  config.fb_location = CAMERA_FB_IN_DRAM;

  config.jpeg_quality = 15;

  config.fb_count = 1;

  esp_err_t err =
    esp_camera_init(&config);

  if (err != ESP_OK) {
    Serial.printf(
      "Camera init failed with error 0x%x\n",
      err);

    return;
  }

  Serial.println(
    "Camera initialized!");

  sensor_t *s =
    esp_camera_sensor_get();

  s->set_brightness(s, 1);
  s->set_contrast(s, 1);
  s->set_saturation(s, 0);
  s->set_sharpness(s, 1);
  s->set_denoise(s, 1);

  s->set_vflip(s, 0);
  s->set_hmirror(s, 0);

  WiFi.mode(WIFI_STA);

  WiFi.begin(
    ssid,
    password);

  WiFi.setSleep(false);

  Serial.print(
    "Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println(
    "WiFi connected!");

  // ========================================
  // START SERVER
  // ========================================

  startCameraServer();

  Serial.print(
    "Camera Ready! Open: http://");

  Serial.println(
    WiFi.localIP());

  registerDevice();
}

// ========================================
// LOOP
// ========================================

void loop() {
  if (emergencyMode) {
    if (millis() - lastFlash > 200) {
      lastFlash = millis();

      flashState = !flashState;

      digitalWrite(4, flashState);
    }
  } else {
    digitalWrite(4, LOW);
  }

  if (millis() - lastHeartbeat > heartbeatInterval) {
    lastHeartbeat = millis();
    sendHeartbeat();
  }

  delay(10);
}
