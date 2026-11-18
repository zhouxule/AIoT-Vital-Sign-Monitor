#include "NetworkManager.h"
#include "config.h"
#include "system_data.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <esp_wifi.h>

static void SetupWiFi(void) {
    WiFi.mode(WIFI_STA);

    // Custom MAC address for campus network authentication bypass
    if (CUSTOM_MAC_ENABLED) {
        esp_wifi_set_mac(WIFI_IF_STA, (uint8_t *)CUSTOM_MAC_ADDRESS);
        Serial.printf("[Network] Custom MAC applied: %02X:%02X:%02X:%02X:%02X:%02X\n",
                      CUSTOM_MAC_ADDRESS[0], CUSTOM_MAC_ADDRESS[1], CUSTOM_MAC_ADDRESS[2],
                      CUSTOM_MAC_ADDRESS[3], CUSTOM_MAC_ADDRESS[4], CUSTOM_MAC_ADDRESS[5]);
    } else {
        Serial.print("[Network] Default Factory MAC: ");
        Serial.println(WiFi.macAddress());
    }

    WiFi.begin(DEFAULT_WIFI_SSID, DEFAULT_WIFI_PASSWORD);
    Serial.printf("[Network] Connecting to Wi-Fi SSID: %s ...\n", DEFAULT_WIFI_SSID);
}

void Network_Init(void) {
    SetupWiFi();
}

// Pull latest device configuration from Supabase device_configs
static void FetchCloudConfig(void) {
    if (WiFi.status() != WL_CONNECTED) return;

    WiFiClientSecure client;
    client.setInsecure(); // Bypass SSL cert validation during prototype dev

    HTTPClient http;
    if (http.begin(client, SUPABASE_CONFIG_URL)) {
        http.addHeader("apikey", SUPABASE_ANON_KEY);
        http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
        http.setTimeout(4000);

        int code = http.GET();
        if (code == 200) {
            String payload = http.getString();
            JsonDocument doc;
            DeserializationError err = deserializeJson(doc, payload);

            if (!err && doc.size() > 0) {
                JsonObject cfg = doc[0];
                if (xSemaphoreTake(g_state_mutex, pdMS_TO_TICKS(50)) == pdTRUE) {
                    g_state.config.sample_interval_seconds = cfg["sample_interval_seconds"] | 3;
                    g_state.config.radar_enabled = cfg["radar_enabled"] | true;
                    g_state.config.waveform_enabled = cfg["waveform_enabled"] | true;
                    g_state.config.sleep_monitor_enabled = cfg["sleep_monitor_enabled"] | true;
                    g_state.config.struggle_alarm_enabled = cfg["struggle_alarm_enabled"] | true;
                    g_state.config.unattended_alarm_enabled = cfg["unattended_alarm_enabled"] | true;
                    g_state.config.unattended_timeout_minutes = cfg["unattended_timeout_minutes"] | 30;
                    g_state.config.sht31_enabled = cfg["sht31_enabled"] | true;
                    g_state.config.mlx90640_enabled = cfg["mlx90640_enabled"] | true;
                    g_state.config.last_sync_ms = millis();
                    xSemaphoreGive(g_state_mutex);

                    Serial.printf("[Network] Config synced from Cloud: interval=%ds, radar=%d, wave=%d\n",
                                  g_state.config.sample_interval_seconds,
                                  g_state.config.radar_enabled,
                                  g_state.config.waveform_enabled);
                }
            }
        }
        http.end();
    }
}

// Upload sensor measurements snapshot to Supabase sensor_readings
static void UploadSensorData(void) {
    if (WiFi.status() != WL_CONNECTED) return;

    // Take a local snapshot of global state under mutex
    RadarData_t radarSnapshot;
    EnvData_t envSnapshot;
    RuntimeConfig_t cfgSnapshot;

    if (xSemaphoreTake(g_state_mutex, pdMS_TO_TICKS(50)) == pdTRUE) {
        memcpy(&radarSnapshot, &g_state.radar, sizeof(RadarData_t));
        memcpy(&envSnapshot, &g_state.env, sizeof(EnvData_t));
        memcpy(&cfgSnapshot, &g_state.config, sizeof(RuntimeConfig_t));
        xSemaphoreGive(g_state_mutex);
    } else {
        return;
    }

    // Serialize to Supabase JSON payload
    JsonDocument doc;
    doc["device_id"] = DEVICE_ID;
    // Format ISO8601 UTC timestamp (or rely on Supabase created_at if NTP not ready)
    // Here we pass empty recorded_at or system time
    doc["recorded_at"] = "now()";

    if (cfgSnapshot.radar_enabled) {
        if (radarSnapshot.heart_rate > 0) doc["heart_rate"] = radarSnapshot.heart_rate;
        if (radarSnapshot.respiratory_rate > 0) doc["respiratory_rate"] = radarSnapshot.respiratory_rate;
        doc["presence"] = radarSnapshot.presence;
        doc["motion_status"] = (radarSnapshot.motion_status == 2) ? "active" :
                               (radarSnapshot.motion_status == 1) ? "motionless" : "none";
        doc["body_movement"] = radarSnapshot.body_movement;
        doc["distance_cm"] = radarSnapshot.distance_cm;

        // Position coordinates
        JsonObject pos = doc["position_xyz"].to<JsonObject>();
        pos["x"] = radarSnapshot.pos_x;
        pos["y"] = radarSnapshot.pos_y;
        pos["z"] = radarSnapshot.pos_z;

        // Waveforms (DP7 & DP10) if enabled
        if (cfgSnapshot.waveform_enabled && radarSnapshot.has_hr_waveform) {
            JsonArray hrArr = doc["heart_rate_waveform"].to<JsonArray>();
            for (int i = 0; i < 5; i++) hrArr.add(radarSnapshot.hr_waveform[i]);
        }
        if (cfgSnapshot.waveform_enabled && radarSnapshot.has_rr_waveform) {
            JsonArray rrArr = doc["respiratory_waveform"].to<JsonArray>();
            for (int i = 0; i < 5; i++) rrArr.add(radarSnapshot.rr_waveform[i]);
        }

        // Sleep metrics (DP11-DP17)
        if (cfgSnapshot.sleep_monitor_enabled) {
            doc["bed_status"] = (radarSnapshot.bed_status == 1) ? "in_bed" : "out_bed";
            doc["sleep_status"] = (radarSnapshot.sleep_status == 0) ? "deep" :
                                  (radarSnapshot.sleep_status == 1) ? "light" :
                                  (radarSnapshot.sleep_status == 2) ? "awake" : "out_bed";
            doc["awake_minutes"] = radarSnapshot.awake_minutes;
            doc["light_sleep_minutes"] = radarSnapshot.light_sleep_minutes;
            doc["deep_sleep_minutes"] = radarSnapshot.deep_sleep_minutes;
            doc["sleep_score"] = radarSnapshot.sleep_score;
            doc["sleep_rating"] = (radarSnapshot.sleep_rating == 1) ? "good" :
                                  (radarSnapshot.sleep_rating == 2) ? "fair" :
                                  (radarSnapshot.sleep_rating == 3) ? "poor" : "none";
            doc["turn_over_count"] = radarSnapshot.turn_over_count;
        }

        // Alarms (DP18/DP19)
        doc["struggle_alarm"] = radarSnapshot.struggle_alarm;
        doc["unattended_alarm"] = radarSnapshot.unattended_alarm;
    }

    // Environmental sensors
    if (cfgSnapshot.sht31_enabled && envSnapshot.env_valid) {
        doc["ambient_temperature"] = envSnapshot.ambient_temperature;
        doc["humidity"] = envSnapshot.humidity;
    }
    if (cfgSnapshot.mlx90640_enabled && envSnapshot.body_temp_valid) {
        doc["body_surface_temperature"] = envSnapshot.body_surface_temperature;
        doc["temperature_valid"] = true;
    }

    String jsonString;
    serializeJson(doc, jsonString);

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    if (http.begin(client, SUPABASE_READINGS_URL)) {
        http.addHeader("apikey", SUPABASE_ANON_KEY);
        http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("Prefer", "return=minimal");
        http.setTimeout(4000);

        int code = http.POST(jsonString);
        if (code == 201 || code == 200) {
            Serial.printf("[Network] Upload OK (HTTP %d): HR=%d, RR=%d, Dist=%dcm\n",
                          code, radarSnapshot.heart_rate, radarSnapshot.respiratory_rate, radarSnapshot.distance_cm);
        } else {
            Serial.printf("[Network] Upload Failed (HTTP %d): %s\n", code, http.errorToString(code).c_str());
        }
        http.end();
    }
}

void Task_Network(void *pvParameters) {
    (void)pvParameters;
    Network_Init();

    Serial.println("[Task_Network] Running on Core 1");

    uint32_t last_upload_ms = 0;
    uint32_t last_config_fetch_ms = 0;
    uint32_t wifi_check_ms = 0;

    while (1) {
        uint32_t now = millis();

        // 1. Maintain Wi-Fi Connection
        if (now - wifi_check_ms >= 5000) {
            wifi_check_ms = now;
            bool connected = (WiFi.status() == WL_CONNECTED);
            if (xSemaphoreTake(g_state_mutex, pdMS_TO_TICKS(20)) == pdTRUE) {
                g_state.wifi_connected = connected;
                xSemaphoreGive(g_state_mutex);
            }
            if (!connected) {
                Serial.println("[Network] Wi-Fi reconnecting...");
                WiFi.reconnect();
            }
        }

        // 2. Fetch cloud config every 30 seconds
        if (now - last_config_fetch_ms >= 30000) {
            last_config_fetch_ms = now;
            FetchCloudConfig();
        }

        // 3. Periodic sensor readings upload
        uint16_t interval_sec = g_state.config.sample_interval_seconds;
        if (interval_sec == 0) interval_sec = 3;

        if (now - last_upload_ms >= (uint32_t)interval_sec * 1000) {
            last_upload_ms = now;
            UploadSensorData();
        }

        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
