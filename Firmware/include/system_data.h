#ifndef SYSTEM_DATA_H
#define SYSTEM_DATA_H

#include <Arduino.h>

// =============================================================================
// SYSTEM DATA STRUCTURES
// Thread-safe shared snapshot among FreeRTOS tasks
// =============================================================================

// R60ABD2 Radar Measurement Snapshot
typedef struct {
    // DP1: Presence (0:无人, 1:有人)
    bool presence;

    // DP2: Motion status (0:无, 1:静止, 2:活跃)
    uint8_t motion_status; // 0=none, 1=motionless, 2=active

    // DP3: Distance in cm (0 ~ 65535 cm)
    uint16_t distance_cm;

    // DP4: Body movement intensity (0 ~ 100)
    uint8_t body_movement;

    // DP5: Spatial coordinates x, y, z in cm
    int16_t pos_x;
    int16_t pos_y;
    int16_t pos_z;

    // DP6: Heart rate (60 ~ 120 bpm)
    uint8_t heart_rate;

    // DP7: 5-point heart rate waveform (0 ~ 255, center 128)
    uint8_t hr_waveform[5];
    bool has_hr_waveform;

    // DP8: Respiratory rate (0 ~ 35 breaths/min)
    uint8_t respiratory_rate;

    // DP9: Respiratory info (1:正常, 2:过高, 3:过低, 4:无)
    uint8_t respiratory_info;

    // DP10: 5-point respiratory waveform (0 ~ 255, center 128)
    uint8_t rr_waveform[5];
    bool has_rr_waveform;

    // DP11: Bed status (0:离床, 1:入床)
    uint8_t bed_status; // 0=out_bed, 1=in_bed, 2=none

    // DP12: Sleep status (0:深睡, 1:浅睡, 2:清醒, 3:无)
    uint8_t sleep_status; // 0=deep, 1=light, 2=awake, 3=none

    // DP13: Sleep durations (minutes)
    uint16_t awake_minutes;
    uint16_t light_sleep_minutes;
    uint16_t deep_sleep_minutes;

    // DP14 & DP20: Sleep score (0~100) and rating (1:良好, 2:一般, 3:较差, 0:无)
    uint8_t sleep_score;
    uint8_t sleep_rating;

    // DP15: Comprehensive sleep metrics
    uint8_t turn_over_count;
    uint8_t large_move_ratio;
    uint8_t small_move_ratio;
    uint8_t apnea_count;

    // DP18: Struggle alarm (0:无, 1:正常, 2:异常挣扎)
    bool struggle_alarm;

    // DP19: Unattended alarm (0:无, 1:正常, 2:异常无人超时)
    bool unattended_alarm;

    uint32_t last_update_ms;
} RadarData_t;

// Environmental Sensor Snapshot (SHT3x / MLX90640)
typedef struct {
    float ambient_temperature;
    float humidity;
    bool env_valid;

    float body_surface_temperature;
    bool body_temp_valid;

    uint32_t last_update_ms;
} EnvData_t;

// Runtime Device Configuration (Synced from Supabase device_configs)
typedef struct {
    uint16_t sample_interval_seconds;
    bool radar_enabled;
    bool waveform_enabled;
    bool sleep_monitor_enabled;
    bool struggle_alarm_enabled;
    char struggle_sensitivity[10]; // "low", "medium", "high"
    bool unattended_alarm_enabled;
    uint16_t unattended_timeout_minutes;
    bool sht31_enabled;
    bool mlx90640_enabled;
    uint32_t last_sync_ms;
} RuntimeConfig_t;

// Global System State
typedef struct {
    RadarData_t radar;
    EnvData_t env;
    RuntimeConfig_t config;
    bool wifi_connected;
} GlobalState_t;

extern GlobalState_t g_state;
extern SemaphoreHandle_t g_state_mutex;

#endif // SYSTEM_DATA_H
