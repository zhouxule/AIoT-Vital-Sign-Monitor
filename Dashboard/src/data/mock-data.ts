import type {
  SensorReading,
  AIPrediction,
  ModelEvaluation,
  DeviceStatus,
  ChatMessage,
  DeviceConfig,
} from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 15)
}

function rand(min: number, max: number, decimals = 1): number {
  const v = Math.random() * (max - min) + min
  const factor = 10 ** decimals
  return Math.round(v * factor) / factor
}

function drift(
  prev: number,
  step: number,
  min: number,
  max: number,
  decimals = 1,
): number {
  const delta = (Math.random() - 0.5) * 2 * step
  const next = prev + delta
  const clamped = Math.max(min, Math.min(max, next))
  const factor = 10 ** decimals
  return Math.round(clamped * factor) / factor
}

// Generate 5-point waveform centered at 128
export function generateWaveform(frequencyHz: number, amplitude: number, phase: number = 0): number[] {
  const points: number[] = []
  for (let i = 0; i < 5; i++) {
    const t = (i / 5) * (2 * Math.PI * frequencyHz) + phase
    const val = 128 + Math.round(amplitude * Math.sin(t) + (Math.random() - 0.5) * 4)
    points.push(Math.max(0, Math.min(255, val)))
  }
  return points
}

// ---------------------------------------------------------------------------
// generateMockReadings
// ---------------------------------------------------------------------------

export function generateMockReadings(
  count: number,
  intervalMinutes: number = 1,
): SensorReading[] {
  const now = Date.now()
  const readings: SensorReading[] = []

  let hr = rand(68, 80)
  let rr = rand(14, 18)
  let ambTemp = rand(23.5, 25.0)
  let humidity = rand(45, 55)
  let bodyTemp = rand(36.3, 36.7, 1)
  let bodyMove = rand(5, 20)
  let dist = rand(130, 160)

  for (let i = count - 1; i >= 0; i--) {
    const ts = new Date(now - i * intervalMinutes * 60_000)
    const isoStr = ts.toISOString()

    hr = drift(hr, 1.5, 55, 110)
    rr = drift(rr, 0.5, 10, 24)
    ambTemp = drift(ambTemp, 0.1, 20, 30, 1)
    humidity = drift(humidity, 0.6, 30, 70, 1)
    bodyTemp = drift(bodyTemp, 0.05, 35.8, 37.5, 1)
    bodyMove = drift(bodyMove, 3, 0, 85, 0)
    dist = drift(dist, 2, 80, 250, 0)

    const isAnomaly = Math.random() < 0.03
    const spikedHr = isAnomaly ? rand(105, 128) : hr
    const presence = Math.random() > 0.03

    readings.push({
      id: uid(),
      device_id: 'esp32_prototype_01',
      recorded_at: isoStr,
      heart_rate: presence ? Math.round(spikedHr) : null,
      respiratory_rate: presence ? Math.round(rr) : null,
      ambient_temperature: ambTemp,
      humidity: humidity,
      body_surface_temperature: presence ? bodyTemp : null,
      presence,
      temperature_valid: presence ? true : null,

      // R60ABD2 extensions
      motion_status: presence ? (bodyMove > 25 ? 'active' : 'motionless') : 'none',
      body_movement: presence ? Math.round(bodyMove) : 0,
      distance_cm: presence ? Math.round(dist) : null,
      position_xyz: presence ? { x: Math.round(rand(-30, 30, 0)), y: Math.round(dist), z: 45 } : null,

      heart_rate_waveform: presence ? generateWaveform(hr / 60, 28, i) : null,
      respiratory_waveform: presence ? generateWaveform(rr / 60, 38, i * 0.8) : null,

      bed_status: presence ? 'in_bed' : 'out_bed',
      sleep_status: presence ? (bodyMove < 10 ? 'deep' : (bodyMove < 25 ? 'light' : 'awake')) : 'out_bed',
      awake_minutes: 35,
      light_sleep_minutes: 180,
      deep_sleep_minutes: 145,
      sleep_score: 87,
      sleep_rating: 'good',
      turn_over_count: 5,
      large_body_move_ratio: 8,
      small_body_move_ratio: 18,
      apnea_count: 0,
      sleep_anomaly: 'none',

      struggle_alarm: false,
      unattended_alarm: false,

      created_at: isoStr,
    })
  }

  return readings
}

// ---------------------------------------------------------------------------
// Static mock objects
// ---------------------------------------------------------------------------

const now = new Date()

export const mockCurrentReading: SensorReading = {
  id: uid(),
  device_id: 'esp32_prototype_01',
  recorded_at: now.toISOString(),
  heart_rate: 74,
  respiratory_rate: 16,
  ambient_temperature: 24.3,
  humidity: 48.2,
  body_surface_temperature: 36.5,
  presence: true,
  temperature_valid: true,

  // R60ABD2
  motion_status: 'motionless',
  body_movement: 12,
  distance_cm: 145,
  position_xyz: { x: 5, y: 145, z: 42 },
  heart_rate_waveform: [128, 148, 155, 136, 115],
  respiratory_waveform: [128, 158, 168, 142, 102],
  bed_status: 'in_bed',
  sleep_status: 'light',
  awake_minutes: 32,
  light_sleep_minutes: 175,
  deep_sleep_minutes: 140,
  sleep_score: 88,
  sleep_rating: 'good',
  turn_over_count: 4,
  large_body_move_ratio: 6,
  small_body_move_ratio: 15,
  apnea_count: 0,
  sleep_anomaly: 'none',
  struggle_alarm: false,
  unattended_alarm: false,

  created_at: now.toISOString(),
}

export const mockDeviceStatus: DeviceStatus = {
  device_id: 'esp32_prototype_01',
  is_online: true,
  last_seen: now.toISOString(),
  last_successful_transmission: now.toISOString(),
  error_count: 0,
  hardware_model: 'R60ABD2 (MicroRadar)',
  firmware_version: 'V3.5',
}

export const mockDeviceConfig: DeviceConfig = {
  device_id: 'esp32_prototype_01',
  sample_interval_seconds: 3,
  radar_enabled: true,
  waveform_enabled: true,
  sleep_monitor_enabled: true,
  struggle_alarm_enabled: true,
  struggle_sensitivity: 'medium',
  unattended_alarm_enabled: true,
  unattended_timeout_minutes: 30,
  sht31_enabled: true,
  mlx90640_enabled: true,
  model_version: 'v1.2.0',
  hardware_model: 'R60ABD2',
  firmware_version: 'v3.5',
  updated_at: now.toISOString(),
}

export const mockPredictions: AIPrediction[] = [
  {
    id: uid(),
    device_id: 'esp32_prototype_01',
    recorded_at: now.toISOString(),
    model_name: 'Random Forest',
    model_version: 'v1.2.0',
    prediction: 'normal',
    anomaly_score: 0.08,
    inference_location: 'edge',
  },
  {
    id: uid(),
    device_id: 'esp32_prototype_01',
    recorded_at: new Date(now.getTime() - 5 * 60_000).toISOString(),
    model_name: 'Random Forest',
    model_version: 'v1.2.0',
    prediction: 'normal',
    anomaly_score: 0.12,
    inference_location: 'edge',
  },
  {
    id: uid(),
    device_id: 'esp32_prototype_01',
    recorded_at: new Date(now.getTime() - 12 * 60_000).toISOString(),
    model_name: 'Random Forest',
    model_version: 'v1.2.0',
    prediction: 'elevated_heart_rate',
    anomaly_score: 0.73,
    inference_location: 'edge',
  },
]

export const mockModelEvaluations: ModelEvaluation[] = [
  {
    id: uid(),
    model_name: 'Random Forest',
    model_version: 'v1.2.0',
    dataset_id: 'physionet-radar-v1',
    evaluation_date: '2026-11-08',
    accuracy: 0.952,
    precision: 0.941,
    recall: 0.938,
    f1_score: 0.939,
    inference_latency_ms: 4.5,
    memory_mb: 1.2,
    model_size_kb: 48.5,
    is_selected: true,
  },
  {
    id: uid(),
    model_name: 'Gradient Boosting',
    model_version: 'v1.1.0',
    dataset_id: 'physionet-radar-v1',
    evaluation_date: '2026-11-08',
    accuracy: 0.961,
    precision: 0.953,
    recall: 0.949,
    f1_score: 0.951,
    inference_latency_ms: 8.2,
    memory_mb: 2.1,
    model_size_kb: 72.0,
    is_selected: false,
  },
  {
    id: uid(),
    model_name: 'Extra Trees',
    model_version: 'v1.0.0',
    dataset_id: 'physionet-radar-v1',
    evaluation_date: '2026-11-08',
    accuracy: 0.945,
    precision: 0.932,
    recall: 0.928,
    f1_score: 0.93,
    inference_latency_ms: 5.1,
    memory_mb: 1.4,
    model_size_kb: 52.3,
    is_selected: false,
  },
  {
    id: uid(),
    model_name: 'Decision Tree',
    model_version: 'v1.0.0',
    dataset_id: 'physionet-radar-v1',
    evaluation_date: '2026-11-08',
    accuracy: 0.898,
    precision: 0.885,
    recall: 0.879,
    f1_score: 0.882,
    inference_latency_ms: 1.2,
    memory_mb: 0.3,
    model_size_kb: 12.8,
    is_selected: false,
  },
  {
    id: uid(),
    model_name: 'Logistic Regression',
    model_version: 'v1.0.0',
    dataset_id: 'physionet-radar-v1',
    evaluation_date: '2026-11-08',
    accuracy: 0.864,
    precision: 0.842,
    recall: 0.835,
    f1_score: 0.838,
    inference_latency_ms: 0.8,
    memory_mb: 0.1,
    model_size_kb: 4.2,
    is_selected: false,
  },
  {
    id: uid(),
    model_name: 'Isolation Forest',
    model_version: 'v1.0.0',
    dataset_id: 'physionet-radar-v1',
    evaluation_date: '2026-11-08',
    accuracy: 0.912,
    precision: 0.901,
    recall: 0.895,
    f1_score: 0.898,
    inference_latency_ms: 3.8,
    memory_mb: 0.9,
    model_size_kb: 36.0,
    is_selected: false,
  },
]

export const mockChatHistory: ChatMessage[] = [
  {
    id: uid(),
    role: 'user',
    content: 'What is the current health status?',
    timestamp: new Date(now.getTime() - 10 * 60_000).toISOString(),
  },
  {
    id: uid(),
    role: 'assistant',
    content: 'Based on the R60ABD2 radar readings, heart rate is normal at 74 bpm, respiratory rate is 16 breaths/min. The person is currently in bed resting in light sleep with no abnormal struggling or apnea events detected.',
    timestamp: new Date(now.getTime() - 9 * 60_000).toISOString(),
  },
]
