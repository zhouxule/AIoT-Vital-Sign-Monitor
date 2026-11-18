-- =============================================================================
-- AIoT-Assisted Contactless Vital Sign Monitoring and Evaluation System
-- Supabase / PostgreSQL Schema Migration
-- Version: 2.0 (Updated for R60ABD2 Radar & Cloud Device Configuration)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Table: sensor_readings (Upgraded for R60ABD2 Radar)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sensor_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    
    -- Basic Vitals & Environmental
    heart_rate REAL,
    respiratory_rate REAL,
    ambient_temperature REAL,
    humidity REAL,
    body_surface_temperature REAL,
    presence BOOLEAN,
    temperature_valid BOOLEAN,

    -- R60ABD2 Radar Sensing & Motion (DP1 - DP5)
    motion_status TEXT,                     -- 'none', 'motionless', 'active'
    body_movement REAL,                     -- 0~100 体动幅度
    distance_cm REAL,                       -- 0~65535 cm 人体距离
    position_xyz JSONB,                     -- {"x":0,"y":0,"z":0} 空间坐标

    -- R60ABD2 Real-time Bio-Waveforms (DP7 & DP10)
    heart_rate_waveform JSONB,              -- 5采样点/秒数组, 中心128
    respiratory_waveform JSONB,             -- 5采样点/秒数组, 中心128

    -- R60ABD2 Sleep Monitoring (DP11 - DP17, DP20)
    bed_status TEXT,                        -- 'in_bed', 'out_bed', 'none'
    sleep_status TEXT,                      -- 'deep', 'light', 'awake', 'out_bed'
    awake_minutes INT,                      -- 清醒时长 (min)
    light_sleep_minutes INT,                -- 浅睡时长 (min)
    deep_sleep_minutes INT,                 -- 深睡时长 (min)
    sleep_score REAL,                       -- 0~100分
    sleep_rating TEXT,                      -- 'good', 'fair', 'poor', 'none'
    turn_over_count INT,                    -- 翻身次数
    large_body_move_ratio REAL,             -- 大幅度体动占比 (0~100)
    small_body_move_ratio REAL,             -- 小幅度体动占比 (0~100)
    apnea_count INT,                        -- 呼吸暂停次数
    sleep_anomaly TEXT,                     -- 'none', 'sleep_under_4h', 'sleep_over_12h', 'abnormal_empty_30m'

    -- R60ABD2 Safety Alarms (DP18 - DP19)
    struggle_alarm BOOLEAN DEFAULT false,   -- 异常挣扎/跌倒预警
    unattended_alarm BOOLEAN DEFAULT false, -- 无人超时滞留报警

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Upgrade existing sensor_readings table if it was created in v1.0
DO $$ 
BEGIN
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS motion_status TEXT;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS body_movement REAL;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS distance_cm REAL;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS position_xyz JSONB;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS heart_rate_waveform JSONB;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS respiratory_waveform JSONB;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS bed_status TEXT;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS sleep_status TEXT;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS awake_minutes INT;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS light_sleep_minutes INT;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS deep_sleep_minutes INT;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS sleep_score REAL;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS sleep_rating TEXT;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS turn_over_count INT;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS large_body_move_ratio REAL;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS small_body_move_ratio REAL;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS apnea_count INT;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS sleep_anomaly TEXT;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS struggle_alarm BOOLEAN DEFAULT false;
    ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS unattended_alarm BOOLEAN DEFAULT false;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_id ON sensor_readings (device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings (recorded_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow public read access for sensor readings"
        ON sensor_readings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow insert via service role or ingestion"
        ON sensor_readings FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable Supabase Realtime for sensor_readings
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Table: device_configs (Device Shadow / Cloud Configuration Sync)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_configs (
    device_id TEXT PRIMARY KEY,
    sample_interval_seconds INT NOT NULL DEFAULT 3,
    radar_enabled BOOLEAN NOT NULL DEFAULT true,
    waveform_enabled BOOLEAN NOT NULL DEFAULT true,
    sleep_monitor_enabled BOOLEAN NOT NULL DEFAULT true,
    struggle_alarm_enabled BOOLEAN NOT NULL DEFAULT true,
    struggle_sensitivity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
    unattended_alarm_enabled BOOLEAN NOT NULL DEFAULT true,
    unattended_timeout_minutes INT NOT NULL DEFAULT 30,  -- 30~180 min
    sht31_enabled BOOLEAN NOT NULL DEFAULT true,
    mlx90640_enabled BOOLEAN NOT NULL DEFAULT true,
    model_version TEXT NOT NULL DEFAULT 'v1.2.0',
    hardware_model TEXT NOT NULL DEFAULT 'R60ABD2',
    firmware_version TEXT NOT NULL DEFAULT 'v3.5',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE device_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow public read access for device_configs"
        ON device_configs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public update access for device_configs"
        ON device_configs FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE device_configs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Insert default device configuration for prototype
INSERT INTO device_configs (
    device_id, sample_interval_seconds, radar_enabled, waveform_enabled, 
    sleep_monitor_enabled, struggle_alarm_enabled, struggle_sensitivity,
    unattended_alarm_enabled, unattended_timeout_minutes,
    sht31_enabled, mlx90640_enabled, model_version, hardware_model, firmware_version
) VALUES (
    'esp32_prototype_01', 3, true, true, true, true, 'medium', true, 30, true, true, 'v1.2.0', 'R60ABD2', 'v3.5'
) ON CONFLICT (device_id) DO UPDATE SET
    hardware_model = 'R60ABD2',
    firmware_version = 'v3.5';

-- -----------------------------------------------------------------------------
-- 3. Table: ai_predictions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    prediction TEXT NOT NULL,
    anomaly_score REAL,
    inference_location TEXT NOT NULL CHECK (inference_location IN ('edge', 'backend')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_predictions_device_id ON ai_predictions (device_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_recorded_at ON ai_predictions (recorded_at DESC);

ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow public read access for ai predictions"
        ON ai_predictions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow insert for ai predictions"
        ON ai_predictions FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_predictions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Table: model_evaluations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    dataset_id TEXT NOT NULL,
    evaluation_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    accuracy REAL,
    precision REAL,
    recall REAL,
    f1_score REAL,
    inference_latency_ms REAL,
    memory_mb REAL,
    model_size_kb REAL,
    is_selected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE model_evaluations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow public read access for model evaluations"
        ON model_evaluations FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Baseline model evaluations seed
INSERT INTO model_evaluations (model_name, model_version, dataset_id, accuracy, precision, recall, f1_score, inference_latency_ms, memory_mb, model_size_kb, is_selected)
VALUES 
    ('Random Forest', 'v1.2.0', 'physionet-radar-v1', 0.952, 0.941, 0.938, 0.939, 4.5, 1.2, 48.5, true),
    ('Gradient Boosting', 'v1.1.0', 'physionet-radar-v1', 0.961, 0.953, 0.949, 0.951, 8.2, 2.1, 72.0, false),
    ('Extra Trees', 'v1.0.0', 'physionet-radar-v1', 0.945, 0.932, 0.928, 0.930, 5.1, 1.4, 52.3, false),
    ('Decision Tree', 'v1.0.0', 'physionet-radar-v1', 0.898, 0.885, 0.879, 0.882, 1.2, 0.3, 12.8, false),
    ('Logistic Regression', 'v1.0.0', 'physionet-radar-v1', 0.864, 0.842, 0.835, 0.838, 0.8, 0.1, 4.2, false),
    ('Isolation Forest', 'v1.0.0', 'physionet-radar-v1', 0.912, 0.901, 0.895, 0.898, 3.8, 0.9, 36.0, false)
ON CONFLICT DO NOTHING;
