#include "R60ABD2.h"
#include "config.h"

// =============================================================================
// R60ABD2 Protocol Constants (According to User Manual V3.5)
// Frame Header: 0x53 0x59
// Frame Tail:   0x54 0x43
// Format: [53 59] [Control] [Command] [Len_H] [Len_L] [Data (len)] [Sum] [54 43]
// =============================================================================

#define FRAME_HEAD_1 0x53
#define FRAME_HEAD_2 0x59
#define FRAME_TAIL_1 0x54
#define FRAME_TAIL_2 0x43

#define RX_BUF_SIZE 256

typedef enum {
    STATE_WAIT_HEAD_1,
    STATE_WAIT_HEAD_2,
    STATE_CONTROL,
    STATE_COMMAND,
    STATE_LEN_H,
    STATE_LEN_L,
    STATE_DATA,
    STATE_SUM,
    STATE_TAIL_1,
    STATE_TAIL_2
} ParserState_t;

static ParserState_t s_state = STATE_WAIT_HEAD_1;
static uint8_t s_control = 0;
static uint8_t s_command = 0;
static uint16_t s_data_len = 0;
static uint16_t s_data_idx = 0;
static uint8_t s_data_buf[RX_BUF_SIZE];
static uint8_t s_calc_sum = 0;
static uint8_t s_recv_sum = 0;

// Buffer for storing the complete raw frame for serial logging
static uint8_t s_raw_frame[RX_BUF_SIZE + 10];
static uint16_t s_raw_idx = 0;

// Diagnostics
static uint32_t s_total_bytes_recv = 0;
static uint32_t s_valid_frames_count = 0;
static uint32_t s_last_byte_ms = 0;

void R60ABD2_Init(void) {
    // Increase hardware UART RX FIFO to 1024 bytes to prevent buffer overflow
    Serial1.setRxBufferSize(1024);
    Serial1.begin(RADAR_BAUDRATE, SERIAL_8N1, RADAR_RX_PIN, RADAR_TX_PIN);

    Serial.printf("[R60ABD2] UART1 initialized on RX:GPIO%d, TX:GPIO%d, Baud:%d\n",
                  RADAR_RX_PIN, RADAR_TX_PIN, RADAR_BAUDRATE);
    Serial.println("[R60ABD2] Wiring Reminder: ESP32 RX(GPIO18) <-> Radar TX | ESP32 TX(GPIO17) <-> Radar RX | GND <-> GND");
    s_last_byte_ms = millis();
}

void R60ABD2_SendCommand(uint8_t control, uint8_t command, const uint8_t *data, uint16_t len) {
    uint8_t frame[RX_BUF_SIZE];
    uint16_t idx = 0;

    frame[idx++] = FRAME_HEAD_1;
    frame[idx++] = FRAME_HEAD_2;
    frame[idx++] = control;
    frame[idx++] = command;
    frame[idx++] = (uint8_t)((len >> 8) & 0xFF);
    frame[idx++] = (uint8_t)(len & 0xFF);

    uint8_t sum = 0;
    for (uint16_t i = 0; i < idx; i++) {
        sum += frame[i];
    }

    for (uint16_t i = 0; i < len; i++) {
        frame[idx++] = data[i];
        sum += data[i];
    }

    frame[idx++] = sum;
    frame[idx++] = FRAME_TAIL_1;
    frame[idx++] = FRAME_TAIL_2;

    Serial1.write(frame, idx);

    // Print command sent in hex
    Serial.printf("[Radar TX Command] ");
    for (uint16_t i = 0; i < idx; i++) {
        Serial.printf("%02X ", frame[i]);
    }
    Serial.println();
}

// Print raw frame in hex format
static void PrintRawFrame(const uint8_t *buf, uint16_t len) {
    Serial.print("[Radar RX Raw] ");
    for (uint16_t i = 0; i < len; i++) {
        Serial.printf("%02X ", buf[i]);
    }
    Serial.println();
}

// Internal packet handler once a valid frame is checked
static void R60ABD2_HandlePacket(uint8_t control, uint8_t command, const uint8_t *data, uint16_t len) {
    s_valid_frames_count++;

    // Print raw bytes
    PrintRawFrame(s_raw_frame, s_raw_idx);

    if (xSemaphoreTake(g_state_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
        g_state.radar.last_update_ms = millis();

        // 1. Presence & Movement (Control: 0x80)
        if (control == 0x80) {
            if (command == 0x01 && len >= 1) { // DP1: Presence
                g_state.radar.presence = (data[0] == 0x01);
                Serial.printf("  └─ [Decoded] 👤 人体存在: %s\n", g_state.radar.presence ? "有人 (Detected)" : "无人 (None)");
            } else if (command == 0x02 && len >= 1) { // DP2: Motion status
                g_state.radar.motion_status = data[0]; // 0=none, 1=motionless, 2=active
                const char *st = (data[0] == 2) ? "活跃运动 (Active)" : (data[0] == 1) ? "静止 (Motionless)" : "无 (None)";
                Serial.printf("  └─ [Decoded] 🏃 运动状态: %s (%d)\n", st, data[0]);
            } else if (command == 0x03 && len >= 1) { // DP4: Body movement intensity
                g_state.radar.body_movement = data[0];
                Serial.printf("  └─ [Decoded] 📊 体动强度: %d / 100\n", data[0]);
            } else if (command == 0x04 && len >= 2) { // DP3: Distance (cm)
                g_state.radar.distance_cm = (data[0] << 8) | data[1];
                Serial.printf("  └─ [Decoded] 📏 目标距离: %d cm\n", g_state.radar.distance_cm);
            } else if (command == 0x05 && len >= 6) { // DP5: Spatial coordinates x,y,z
                int16_t raw_x = (data[0] << 8) | data[1];
                int16_t raw_y = (data[2] << 8) | data[3];
                int16_t raw_z = (data[4] << 8) | data[5];
                g_state.radar.pos_x = (raw_x & 0x8000) ? -(raw_x & 0x7FFF) : raw_x;
                g_state.radar.pos_y = (raw_y & 0x8000) ? -(raw_y & 0x7FFF) : raw_y;
                g_state.radar.pos_z = (raw_z & 0x8000) ? -(raw_z & 0x7FFF) : raw_z;
                Serial.printf("  └─ [Decoded] 📍 空间坐标 XYZ: (%d, %d, %d) cm\n",
                              g_state.radar.pos_x, g_state.radar.pos_y, g_state.radar.pos_z);
            }
        }
        // 2. Respiratory Monitoring (Control: 0x81)
        else if (control == 0x81) {
            if (command == 0x01 && len >= 1) { // DP9: Respiratory Info
                g_state.radar.respiratory_info = data[0];
                const char *r_desc = (data[0] == 1) ? "正常 (Normal)" : (data[0] == 2) ? "过快 (Tachypnea)" :
                                     (data[0] == 3) ? "过缓 (Bradypnea)" : (data[0] == 4) ? "未检测 (None)" : "未知";
                Serial.printf("  └─ [Decoded] 🫁 呼吸状态: %s (%d)\n", r_desc, data[0]);
            } else if (command == 0x02 && len >= 1) { // DP8: Respiratory rate
                g_state.radar.respiratory_rate = data[0];
                Serial.printf("  └─ [Decoded] 🫁 实时呼吸率: %d 次/分 (rpm)\n", data[0]);
            } else if (command == 0x05 && len >= 5) { // DP10: 5-point Respiratory Waveform
                for (int i = 0; i < 5; i++) {
                    g_state.radar.rr_waveform[i] = data[i];
                }
                g_state.radar.has_rr_waveform = true;
                Serial.printf("  └─ [Decoded] 💨 呼吸波形(5Hz): [%d, %d, %d, %d, %d]\n",
                              data[0], data[1], data[2], data[3], data[4]);
            }
        }
        // 3. Heart Rate Monitoring (Control: 0x85)
        else if (control == 0x85) {
            if (command == 0x02 && len >= 1) { // DP6: Heart rate
                g_state.radar.heart_rate = data[0];
                Serial.printf("  └─ [Decoded] ❤️ 实时心率: %d 次/分 (bpm)\n", data[0]);
            } else if (command == 0x05 && len >= 5) { // DP7: 5-point Heart Rate Waveform
                for (int i = 0; i < 5; i++) {
                    g_state.radar.hr_waveform[i] = data[i];
                }
                g_state.radar.has_hr_waveform = true;
                Serial.printf("  └─ [Decoded] 💓 心率波形(5Hz): [%d, %d, %d, %d, %d]\n",
                              data[0], data[1], data[2], data[3], data[4]);
            }
        }
        // 4. Sleep Monitoring (Control: 0x84)
        else if (control == 0x84) {
            if (command == 0x01 && len >= 1) { // DP11: Bed status
                g_state.radar.bed_status = data[0]; // 0=out, 1=in
                Serial.printf("  └─ [Decoded] 🛏️ 在床状态: %s\n", (data[0] == 1) ? "在床 (In Bed)" : "离床 (Out of Bed)");
            } else if (command == 0x02 && len >= 1) { // DP12: Sleep status
                g_state.radar.sleep_status = data[0]; // 0=deep, 1=light, 2=awake
                const char *s_desc = (data[0] == 0) ? "深睡 (Deep)" : (data[0] == 1) ? "浅睡 (Light)" :
                                     (data[0] == 2) ? "清醒 (Awake)" : (data[0] == 3) ? "离床 (Out Bed)" : "未知";
                Serial.printf("  └─ [Decoded] 💤 睡眠分期: %s (%d)\n", s_desc, data[0]);
            } else if (command == 0x03 && len >= 2) { // Awake minutes
                g_state.radar.awake_minutes = (data[0] << 8) | data[1];
                Serial.printf("  └─ [Decoded] ⏰ 清醒时长: %d 分钟\n", g_state.radar.awake_minutes);
            } else if (command == 0x04 && len >= 2) { // Light sleep minutes
                g_state.radar.light_sleep_minutes = (data[0] << 8) | data[1];
                Serial.printf("  └─ [Decoded] ⏰ 浅睡时长: %d 分钟\n", g_state.radar.light_sleep_minutes);
            } else if (command == 0x05 && len >= 2) { // Deep sleep minutes
                g_state.radar.deep_sleep_minutes = (data[0] << 8) | data[1];
                Serial.printf("  └─ [Decoded] ⏰ 深睡时长: %d 分钟\n", g_state.radar.deep_sleep_minutes);
            } else if (command == 0x06 && len >= 1) { // DP14: Sleep score
                g_state.radar.sleep_score = data[0];
                Serial.printf("  └─ [Decoded] 🏆 综合睡眠评分: %d 分\n", data[0]);
            } else if (command == 0x10 && len >= 1) { // DP20: Sleep rating
                g_state.radar.sleep_rating = data[0];
                Serial.printf("  └─ [Decoded] 🌟 睡眠质量等级: %d\n", data[0]);
            } else if (command == 0x11 && len >= 1) { // DP18: Struggle alarm
                g_state.radar.struggle_alarm = (data[0] == 0x02);
                if (g_state.radar.struggle_alarm) {
                    Serial.println("  └─ [ALARM] ⚠️ 跌倒/剧烈挣扎警报触发！");
                }
            } else if (command == 0x12 && len >= 1) { // DP19: Unattended alarm
                g_state.radar.unattended_alarm = (data[0] == 0x02);
                if (g_state.radar.unattended_alarm) {
                    Serial.println("  └─ [ALARM] ⚠️ 无人超时离床警报触发！");
                }
            }
        }
        // 5. Product & Version Info (Control: 0x02)
        else if (control == 0x02) {
            char str_buf[64] = {0};
            uint16_t copy_len = (len < sizeof(str_buf) - 1) ? len : sizeof(str_buf) - 1;
            memcpy(str_buf, data, copy_len);
            if (command == 0x02) {
                Serial.printf("  └─ [Decoded] ℹ️ 固件版本: %s\n", str_buf);
            } else if (command == 0x03) {
                Serial.printf("  └─ [Decoded] ℹ️ 模块型号: %s\n", str_buf);
            } else if (command == 0x04) {
                Serial.printf("  └─ [Decoded] ℹ️ 产品ID序列号: %s\n", str_buf);
            }
        }

        xSemaphoreGive(g_state_mutex);
    }
}

void R60ABD2_ProcessByte(uint8_t byte) {
    s_total_bytes_recv++;
    s_last_byte_ms = millis();

    switch (s_state) {
        case STATE_WAIT_HEAD_1:
            if (byte == FRAME_HEAD_1) {
                s_raw_idx = 0;
                s_raw_frame[s_raw_idx++] = byte;
                s_calc_sum = byte;
                s_state = STATE_WAIT_HEAD_2;
            }
            break;

        case STATE_WAIT_HEAD_2:
            if (byte == FRAME_HEAD_2) {
                s_raw_frame[s_raw_idx++] = byte;
                s_calc_sum += byte;
                s_state = STATE_CONTROL;
            } else if (byte == FRAME_HEAD_1) {
                // If consecutive 0x53 0x53, stay in STATE_WAIT_HEAD_2
                s_raw_idx = 0;
                s_raw_frame[s_raw_idx++] = byte;
                s_calc_sum = byte;
            } else {
                s_state = STATE_WAIT_HEAD_1;
            }
            break;

        case STATE_CONTROL:
            s_raw_frame[s_raw_idx++] = byte;
            s_control = byte;
            s_calc_sum += byte;
            s_state = STATE_COMMAND;
            break;

        case STATE_COMMAND:
            s_raw_frame[s_raw_idx++] = byte;
            s_command = byte;
            s_calc_sum += byte;
            s_state = STATE_LEN_H;
            break;

        case STATE_LEN_H:
            s_raw_frame[s_raw_idx++] = byte;
            s_data_len = (uint16_t)(byte << 8);
            s_calc_sum += byte;
            s_state = STATE_LEN_L;
            break;

        case STATE_LEN_L:
            s_raw_frame[s_raw_idx++] = byte;
            s_data_len |= byte;
            s_calc_sum += byte;
            s_data_idx = 0;
            if (s_data_len == 0) {
                s_state = STATE_SUM;
            } else if (s_data_len > RX_BUF_SIZE) {
                // Length exceeds buffer size, reset
                s_state = STATE_WAIT_HEAD_1;
            } else {
                s_state = STATE_DATA;
            }
            break;

        case STATE_DATA:
            if (s_raw_idx < sizeof(s_raw_frame) - 4) {
                s_raw_frame[s_raw_idx++] = byte;
            }
            s_data_buf[s_data_idx++] = byte;
            s_calc_sum += byte;
            if (s_data_idx >= s_data_len) {
                s_state = STATE_SUM;
            }
            break;

        case STATE_SUM:
            if (s_raw_idx < sizeof(s_raw_frame) - 3) {
                s_raw_frame[s_raw_idx++] = byte;
            }
            s_recv_sum = byte;
            s_state = STATE_TAIL_1;
            break;

        case STATE_TAIL_1:
            if (byte == FRAME_TAIL_1) {
                if (s_raw_idx < sizeof(s_raw_frame) - 2) {
                    s_raw_frame[s_raw_idx++] = byte;
                }
                s_state = STATE_TAIL_2;
            } else {
                s_state = STATE_WAIT_HEAD_1;
            }
            break;

        case STATE_TAIL_2:
            if (byte == FRAME_TAIL_2) {
                if (s_raw_idx < sizeof(s_raw_frame) - 1) {
                    s_raw_frame[s_raw_idx++] = byte;
                }
                if (s_calc_sum == s_recv_sum) {
                    R60ABD2_HandlePacket(s_control, s_command, s_data_buf, s_data_len);
                } else {
                    Serial.printf("[Radar RX Error] ❌ 校验和不匹配: 计算=0x%02X, 接收=0x%02X\n",
                                  s_calc_sum, s_recv_sum);
                }
            }
            s_state = STATE_WAIT_HEAD_1;
            break;
    }
}

void Task_Radar(void *pvParameters) {
    (void)pvParameters;
    R60ABD2_Init();

    Serial.println("[Task_Radar] FreeRTOS Task running on Core 0");

    // Wait 800ms for radar power-on stabilization
    vTaskDelay(pdMS_TO_TICKS(800));

    // Auto-enable 5Hz Doppler Waveforms:
    // As per R60ABD2 User Manual V3.5, waveform reporting is DISABLED by default!
    uint8_t enable_val = 0x01;
    R60ABD2_SendCommand(0x85, 0x0A, &enable_val, 1); // Enable DP7 Heart Rate Waveform
    vTaskDelay(pdMS_TO_TICKS(100));
    R60ABD2_SendCommand(0x81, 0x0C, &enable_val, 1); // Enable DP10 Respiratory Waveform
    Serial.println("[R60ABD2] Sent auto-enable commands for 5Hz HR & RR Doppler waveforms (DP7 & DP10).");

    uint32_t last_diagnostic_check = millis();

    while (1) {
        // Read all available bytes from hardware serial FIFO
        while (Serial1.available()) {
            uint8_t b = Serial1.read();
            R60ABD2_ProcessByte(b);
        }

        // Diagnostic watchdog: check if any bytes received every 4 seconds
        uint32_t now = millis();
        if (now - last_diagnostic_check >= 4000) {
            last_diagnostic_check = now;
            if (s_total_bytes_recv == 0 || (now - s_last_byte_ms >= 4000)) {
                Serial.printf("\n[Radar Diagnostic] ⚠️ 警告: 已超过4秒未接收到雷达数据 (总接收字节:%u, 完整帧数:%u)!\n",
                              s_total_bytes_recv, s_valid_frames_count);
                Serial.printf("  ├─ 当前配置引脚: ESP32 RX=GPIO%d, TX=GPIO%d, 波特率=115200\n", RADAR_RX_PIN, RADAR_TX_PIN);
                Serial.println("  ├─ 接线排查重点 1: ESP32 GPIO18 必须连接 R60ABD2 的 TX (不能是 RX 接 RX!)");
                Serial.println("  ├─ 接线排查重点 2: ESP32 GND 必须与 R60ABD2 GND 紧密共地!");
                Serial.println("  └─ 接线排查重点 3: R60ABD2 供电是否为 5V 且电源电流充足 (>500mA)\n");
            }
        }

        // Small yield to allow other Core 0 tasks (Sensors/LED) to execute
        vTaskDelay(pdMS_TO_TICKS(5));
    }
}
