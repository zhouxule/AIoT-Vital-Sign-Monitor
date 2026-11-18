#include <Arduino.h>
#include "config.h"
#include "system_data.h"
#include "R60ABD2.h"
#include "NetworkManager.h"
#include "SensorManager.h"

// =============================================================================
// GLOBAL STATE & MUTEX DEFINITIONS
// =============================================================================
GlobalState_t g_state;
SemaphoreHandle_t g_state_mutex = NULL;

void setup() {
    // 1. Initialize Serial debugging console (CH343P / USB-CDC)
    Serial.begin(115200);
    delay(1000); // Wait for USB-CDC enumeration if needed

    Serial.println("\n========================================================");
    Serial.println("  AIoT Contactless Vital Sign System - ESP32-S3 Firmware");
    Serial.println("  Hardware: ESP32-S3 + R60ABD2 mmWave Radar (V3.5)");
    Serial.println("========================================================");

    // 2. Create FreeRTOS Mutex for thread-safe state access
    g_state_mutex = xSemaphoreCreateMutex();
    if (g_state_mutex == NULL) {
        Serial.println("[Error] Failed to create g_state_mutex! Halting.");
        while (1) { delay(1000); }
    }

    // 3. Initialize default system state
    memset(&g_state, 0, sizeof(GlobalState_t));
    g_state.config.sample_interval_seconds = 3;
    g_state.config.radar_enabled = true;
    g_state.config.waveform_enabled = true;
    g_state.config.sleep_monitor_enabled = true;
    g_state.config.struggle_alarm_enabled = true;
    strcpy(g_state.config.struggle_sensitivity, "medium");
    g_state.config.unattended_alarm_enabled = true;
    g_state.config.unattended_timeout_minutes = 30;
    g_state.config.sht31_enabled = true;
    g_state.config.mlx90640_enabled = true;

    // 4. Create FreeRTOS Tasks with Core Pinning
    // Core 0: High-throughput Sensor I/O & Radar UART
    // Core 1: Wi-Fi, TLS & HTTPS Network I/O

    xTaskCreatePinnedToCore(
        Task_Radar,         // Task function
        "Task_Radar",       // Task name
        4096,               // Stack depth (bytes/words)
        NULL,               // Parameters
        5,                  // High priority
        NULL,               // Task handle
        0                   // Pin to Core 0
    );

    xTaskCreatePinnedToCore(
        Task_Sensors,       // Task function
        "Task_Sensors",     // Task name
        4096,               // Stack depth
        NULL,               // Parameters
        2,                  // Low-Medium priority
        NULL,               // Task handle
        0                   // Pin to Core 0
    );

    xTaskCreatePinnedToCore(
        Task_Network,       // Task function
        "Task_Network",     // Task name
        8192,               // Stack depth (TLS + HTTP requires more stack)
        NULL,               // Parameters
        3,                  // Medium priority
        NULL,               // Task handle
        1                   // Pin to Core 1
    );

    Serial.println("[System] FreeRTOS multi-core tasks launched successfully.");
}

void loop() {
    // In FreeRTOS application, loop() is executed by Arduino background task on Core 1.
    // We let the dedicated tasks do the work and keep loop() sleeping.
    vTaskDelay(pdMS_TO_TICKS(1000));
}
