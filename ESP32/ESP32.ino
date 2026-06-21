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

const char* CAMERA_1_IP = "10.200.21.66";
const char* CAMERA_2_IP = "10.200.21.145";

bool lastButtonState = HIGH;
bool emergencyState = false;

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
// CAMERA REQUEST FUNCTION
// ========================================

void sendCameraRequest(
  const char* ip,
  const char* route) {
  HTTPClient http;

  String url =
    String("http://") + ip + route;

  Serial.print("Sending Request: ");
  Serial.println(url);

  http.begin(url);

  int responseCode =
    http.GET();

  Serial.print("Response Code: ");
  Serial.println(responseCode);

  http.end();
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

  sendCameraRequest(
    CAMERA_2_IP,
    "/emergency/on");

  sendCameraRequest(
    CAMERA_1_IP,
    "/emergency/on");
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

  sendCameraRequest(
    CAMERA_2_IP,
    "/emergency/off");

  sendCameraRequest(
    CAMERA_1_IP,
    "/emergency/off");
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
  server.handleClient();
}
