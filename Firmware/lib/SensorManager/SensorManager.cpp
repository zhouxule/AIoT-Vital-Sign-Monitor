#include "SensorManager.h"
#include "config.h"
#include "system_data.h"
#include <Wire.h>

void Sensors_Init(void) {
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, I2C_FREQ_HZ);
    Serial.printf("[Sensors] I2C bus initialized on SDA:%d, SCL:%d, Freq:%d Hz\n",
                  I2C_SDA_PIN, I2C_SCL_PIN, I2C_FREQ_HZ);

    // Initialize Status LED (GPIO48 WS2812)
    rgbLedWrite(RGB_LED_PIN, 0, 0, 30); // Dim blue on boot
}

void Task_Sensors(void *pvParameters) {
    (void)pvParameters;
    Sensors_Init();

    Serial.println("[Task_Sensors] Running on Core 0");

    while (1) {
        // 1. Read I2C Temperature & Humidity Sensor (SHT3x / AHT20 etc.)
        // When you select the exact sensor model, insert your read calls here.
        // For now, prepare clean baseline update:
        if (xSemaphoreTake(g_state_mutex, pdMS_TO_TICKS(20)) == pdTRUE) {
            // Placeholder: once wire sensor attached, replace with:
            // g_state.env.ambient_temperature = sht.readTemperature();
            // g_state.env.humidity = sht.readHumidity();
            // g_state.env.env_valid = true;

            // 2. Drive RGB LED based on system health & alarms:
            if (g_state.radar.struggle_alarm || g_state.radar.unattended_alarm) {
                // RED: Emergency Alarm
                rgbLedWrite(RGB_LED_PIN, 255, 0, 0);
            } else if (!g_state.wifi_connected) {
                // BLUE: Wi-Fi Connecting
                rgbLedWrite(RGB_LED_PIN, 0, 0, 80);
            } else if (g_state.radar.presence) {
                // GREEN: Person detected, normal monitoring
                rgbLedWrite(RGB_LED_PIN, 0, 80, 0);
            } else {
                // CYAN / Muted: Normal standby
                rgbLedWrite(RGB_LED_PIN, 0, 30, 30);
            }

            xSemaphoreGive(g_state_mutex);
        }

        // Loop delay (e.g. 500ms ~ 1000ms is ideal for environmental reading)
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}
