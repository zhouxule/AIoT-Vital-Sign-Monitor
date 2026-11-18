#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// =============================================================================
// 1. PIN DEFINITIONS (ESP32-S3 WROOM-1)
// Note: GPIO43/44 (U0TXD/U0RXD) are reserved for CH343P USB-UART debugger.
// =============================================================================

// R60ABD2 Radar UART (UART1)
#define RADAR_UART_NUM        1
#define RADAR_RX_PIN          18    // ESP32 RX <- R60ABD2 TX
#define RADAR_TX_PIN          17    // ESP32 TX -> R60ABD2 RX
#define RADAR_BAUDRATE        115200

// I2C Pins (For SHT3x and MLX90640)
#define I2C_SDA_PIN           8     // I2C Data
#define I2C_SCL_PIN           9     // I2C Clock
#define I2C_FREQ_HZ           400000 // 400kHz Fast Mode

// On-board Status RGB LED (WS2812)
#define RGB_LED_PIN           48

// =============================================================================
// 2. WI-FI & MAC CONFIGURATION
// =============================================================================
// Wi-Fi Credentials
#define DEFAULT_WIFI_SSID     "Xiaomi_502B"
#define DEFAULT_WIFI_PASSWORD "727121Yz"

// Custom MAC Address (Format: 6 bytes hex)
// Set CUSTOM_MAC_ENABLED to true if you want to clone/spoof a registered MAC
// to bypass school/campus network authentication (e.g. your registered laptop MAC).
#define CUSTOM_MAC_ENABLED    false
static const uint8_t CUSTOM_MAC_ADDRESS[6] = { 0x00, 0x11, 0x22, 0x33, 0x44, 0x55 };

// =============================================================================
// 3. SUPABASE CLOUD BACKEND CONFIGURATION
// =============================================================================
#define SUPABASE_BASE_URL     "https://xfmpvxivuhakegkngnff.supabase.co"
#define SUPABASE_ANON_KEY     "sb_publishable_-Ad2aOwrXwyy6gmnWY2Yfg_bmf6-U2j"
#define DEVICE_ID             "esp32_prototype_01"

// Supabase REST Endpoints
#define SUPABASE_READINGS_URL SUPABASE_BASE_URL "/rest/v1/sensor_readings"
#define SUPABASE_CONFIG_URL   SUPABASE_BASE_URL "/rest/v1/device_configs?device_id=eq." DEVICE_ID

#endif // CONFIG_H
