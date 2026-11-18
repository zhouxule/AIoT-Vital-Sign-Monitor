// =============================================================================
// AIoT-Assisted Contactless Vital Sign Monitoring and Evaluation System
// Comprehensive Type Definitions with R60ABD2 Sensor Protocol Support
// =============================================================================

// Sensor reading from the database (R60ABD2 mmWave Radar + SHT31 + MLX90640)
export interface SensorReading {
  id: string;
  device_id: string;
  recorded_at: string;

  // Basic Vital Signs
  heart_rate: number | null;                // DP6: 60-120 bpm
  respiratory_rate: number | null;          // DP8: 0-35 breaths/min
  ambient_temperature: number | null;       // SHT31: °C
  humidity: number | null;                  // SHT31: %RH
  body_surface_temperature: number | null;  // MLX90640: °C
  temperature_valid: boolean | null;

  // R60ABD2 Radar Sensing & Motion (DP1-DP5)
  presence: boolean | null;                                    // DP1: 人体存在
  motion_status: 'none' | 'motionless' | 'active' | null;     // DP2: 运动状态 (00:无, 01:静止, 02:活跃)
  body_movement: number | null;                                // DP4: 体动幅度参数 (0-100)
  distance_cm: number | null;                                  // DP3: 人体距离 (0-65535 cm)
  position_xyz: { x: number; y: number; z: number } | null;    // DP5: 人体空间三维方位坐标 (cm)

  // R60ABD2 Real-time Bio-Waveforms (DP7 & DP10)
  // 5 values per second, centered at 128 (0-255 scale)
  heart_rate_waveform: number[] | null;     // DP7: 心率波形
  respiratory_waveform: number[] | null;    // DP10: 呼吸波形

  // R60ABD2 Sleep Monitoring (DP11-DP17, DP20)
  bed_status: 'in_bed' | 'out_bed' | 'none' | null;                 // DP11: 入床/离床
  sleep_status: 'deep' | 'light' | 'awake' | 'out_bed' | 'none' | null; // DP12: 睡眠阶段
  awake_minutes: number | null;                                     // DP13: 清醒时长 (min)
  light_sleep_minutes: number | null;                               // DP13: 浅睡时长 (min)
  deep_sleep_minutes: number | null;                                // DP13: 深睡时长 (min)
  sleep_score: number | null;                                       // DP14: 睡眠质量评分 (0-100)
  sleep_rating: 'none' | 'good' | 'fair' | 'poor' | null;           // DP20: 睡眠质量评级
  turn_over_count: number | null;                                   // DP15: 翻身次数
  large_body_move_ratio: number | null;                             // DP15: 大幅度体动占比 (0-100%)
  small_body_move_ratio: number | null;                             // DP15: 小幅度体动占比 (0-100%)
  apnea_count: number | null;                                       // DP15: 呼吸暂停次数
  sleep_anomaly: 'none' | 'sleep_under_4h' | 'sleep_over_12h' | 'abnormal_empty_30m' | null; // DP17: 睡眠异常

  // R60ABD2 Safety Alarms (DP18-DP19)
  struggle_alarm: boolean | null;           // DP18: 异常挣扎/跌倒预警
  unattended_alarm: boolean | null;         // DP19: 无人超时滞留报警

  created_at: string;
}

// Device configuration / Digital Twin (Shadow) synced with Supabase
export interface DeviceConfig {
  device_id: string;
  sample_interval_seconds: number;
  radar_enabled: boolean;
  waveform_enabled: boolean;
  sleep_monitor_enabled: boolean;
  struggle_alarm_enabled: boolean;
  struggle_sensitivity: 'low' | 'medium' | 'high';
  unattended_alarm_enabled: boolean;
  unattended_timeout_minutes: number;
  sht31_enabled: boolean;
  mlx90640_enabled: boolean;
  model_version: string;
  hardware_model: string;
  firmware_version: string;
  updated_at: string;
}

// AI prediction result
export interface AIPrediction {
  id: string;
  device_id: string;
  recorded_at: string;
  model_name: string;
  model_version: string;
  prediction: string;
  anomaly_score: number | null;
  inference_location: 'edge' | 'backend';
}

// Model evaluation metrics
export interface ModelEvaluation {
  id: string;
  model_name: string;
  model_version: string;
  dataset_id: string;
  evaluation_date: string;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  inference_latency_ms: number | null;
  memory_mb: number | null;
  model_size_kb: number | null;
  is_selected: boolean;
}

// Device status
export interface DeviceStatus {
  device_id: string;
  is_online: boolean;
  last_seen: string;
  last_successful_transmission: string | null;
  error_count: number;
  hardware_model?: string;
  firmware_version?: string;
}

// Chat message for AI assistant
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Time range option
export type TimeRange = '15m' | '1h' | '24h' | 'custom';
