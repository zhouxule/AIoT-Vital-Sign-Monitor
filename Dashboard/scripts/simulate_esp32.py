import time
import datetime
import random
import json
import math
import urllib.request
import urllib.error
import ssl

# =============================================================================
# ESP32-S3 + R60ABD2 Radar Full-Feature Ingestion Simulator
# Based on R60ABD2 User Manual V3.5 & Device Shadow Architecture
# =============================================================================

SUPABASE_URL = "https://xfmpvxivuhakegkngnff.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_-Ad2aOwrXwyy6gmnWY2Yfg_bmf6-U2j"
READINGS_ENDPOINT = f"{SUPABASE_URL}/rest/v1/sensor_readings"
CONFIG_ENDPOINT = f"{SUPABASE_URL}/rest/v1/device_configs?device_id=eq.esp32_prototype_01"
DEVICE_ID = "esp32_prototype_01"

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# SSL context avoiding Windows certificate store ASN1 parse bugs:
ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Device shadow local runtime state (synced from Supabase device_configs)
runtime_config = {
    "sample_interval_seconds": 3,
    "radar_enabled": True,
    "waveform_enabled": True,
    "sleep_monitor_enabled": True,
    "struggle_alarm_enabled": True,
    "struggle_sensitivity": "medium",
    "unattended_alarm_enabled": True,
    "unattended_timeout_minutes": 30,
    "sht31_enabled": True,
    "mlx90640_enabled": True,
}

# Baseline simulated values
hr = 74.0
rr = 16.0
temp = 24.5
humidity = 50.0
body_temp = 36.5
body_move = 12.0
distance = 145.0
phase = 0.0

def clamp(val, min_v, max_v):
    return max(min_v, min(max_v, val))

def generate_r60abd2_waveform(freq_hz, amplitude, current_phase):
    """Generate 5 samples per second, centered at 128 (0-255 scale) according to DP7/DP10"""
    samples = []
    for i in range(5):
        t = (i / 5.0) * (2 * math.pi * freq_hz) + current_phase
        val = 128 + int(amplitude * math.sin(t) + random.uniform(-2, 2))
        samples.append(clamp(val, 0, 255))
    return samples

def fetch_cloud_config():
    """Simulates ESP32 pulling device shadow config from Supabase via GET"""
    global runtime_config
    try:
        req = urllib.request.Request(CONFIG_ENDPOINT, headers=headers, method="GET")
        with urllib.request.urlopen(req, context=ssl_context, timeout=5) as resp:
            if resp.status == 200:
                body = resp.read().decode("utf-8")
                configs = json.loads(body)
                if configs and len(configs) > 0:
                    cfg = configs[0]
                    old_interval = runtime_config["sample_interval_seconds"]
                    new_interval = cfg.get("sample_interval_seconds", 3)
                    
                    runtime_config.update({
                        "sample_interval_seconds": new_interval,
                        "radar_enabled": cfg.get("radar_enabled", True),
                        "waveform_enabled": cfg.get("waveform_enabled", True),
                        "sleep_monitor_enabled": cfg.get("sleep_monitor_enabled", True),
                        "struggle_alarm_enabled": cfg.get("struggle_alarm_enabled", True),
                        "struggle_sensitivity": cfg.get("struggle_sensitivity", "medium"),
                        "unattended_alarm_enabled": cfg.get("unattended_alarm_enabled", True),
                        "unattended_timeout_minutes": cfg.get("unattended_timeout_minutes", 30),
                        "sht31_enabled": cfg.get("sht31_enabled", True),
                        "mlx90640_enabled": cfg.get("mlx90640_enabled", True),
                    })
                    print(f"[*] [Cloud Config Synced] Interval={new_interval}s, Radar={runtime_config['radar_enabled']}, Waveform={runtime_config['waveform_enabled']}, Sleep={runtime_config['sleep_monitor_enabled']}")
    except Exception as e:
        print(f"[!] Config fetch skipped: {e}")

print("=========================================================================")
print(f"[*] Starting ESP32-S3 + R60ABD2 mmWave Radar Simulator (V3.5)")
print(f"[*] Target Cloud DB: {SUPABASE_URL}")
print(f"[*] Target Device ID: {DEVICE_ID}")
print(f"[*] Device Shadow Sync: Active (Automatic two-way sync with device_configs)")
print("=========================================================================")

# Fetch initial config on boot
fetch_cloud_config()

seq = 1

try:
    while True:
        # Check cloud config every 5 iterations
        if seq % 5 == 0:
            fetch_cloud_config()

        interval = runtime_config["sample_interval_seconds"]

        # Physics simulation drift
        hr = clamp(hr + random.uniform(-1.2, 1.2), 62.0, 105.0)
        rr = clamp(rr + random.uniform(-0.4, 0.4), 12.0, 22.0)
        temp = clamp(temp + random.uniform(-0.1, 0.1), 21.0, 27.0)
        humidity = clamp(humidity + random.uniform(-0.3, 0.3), 40.0, 65.0)
        body_temp = clamp(body_temp + random.uniform(-0.04, 0.04), 36.1, 37.3)
        body_move = clamp(body_move + random.uniform(-2.0, 2.0), 4.0, 75.0)
        distance = clamp(distance + random.uniform(-1.5, 1.5), 100.0, 220.0)
        phase += 1.0

        presence = True
        motion_status = "active" if body_move > 25.0 else "motionless"

        # Occasional heart rate anomaly spike (~3%)
        current_hr = round(hr, 1)
        if random.random() < 0.03:
            current_hr = round(random.uniform(110.0, 126.0), 1)

        # Safety alarms simulation (DP18/DP19)
        struggle = False
        if runtime_config["struggle_alarm_enabled"] and random.random() < 0.01:
            struggle = True

        unattended = False
        if runtime_config["unattended_alarm_enabled"] and random.random() < 0.005:
            unattended = True

        # Generate waveforms if enabled (DP7/DP10)
        hr_waveform = generate_r60abd2_waveform(hr / 60.0, 28, phase) if runtime_config["waveform_enabled"] else None
        rr_waveform = generate_r60abd2_waveform(rr / 60.0, 36, phase * 0.8) if runtime_config["waveform_enabled"] else None

        # Assemble full R60ABD2 JSON payload
        payload = {
            "device_id": DEVICE_ID,
            "recorded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),

            # Basic Physiological & Environmental
            "heart_rate": current_hr if runtime_config["radar_enabled"] else None,
            "respiratory_rate": round(rr, 1) if runtime_config["radar_enabled"] else None,
            "ambient_temperature": round(temp, 1) if runtime_config["sht31_enabled"] else None,
            "humidity": round(humidity, 1) if runtime_config["sht31_enabled"] else None,
            "body_surface_temperature": round(body_temp, 1) if runtime_config["mlx90640_enabled"] else None,
            "presence": presence if runtime_config["radar_enabled"] else False,
            "temperature_valid": runtime_config["mlx90640_enabled"],

            # R60ABD2 Radar Features
            "motion_status": motion_status if runtime_config["radar_enabled"] else "none",
            "body_movement": round(body_move, 1) if runtime_config["radar_enabled"] else 0,
            "distance_cm": round(distance, 1) if runtime_config["radar_enabled"] else None,
            "position_xyz": {"x": round(random.uniform(-25, 25), 1), "y": round(distance, 1), "z": 45.0} if runtime_config["radar_enabled"] else None,
            "heart_rate_waveform": hr_waveform,
            "respiratory_waveform": rr_waveform,

            # R60ABD2 Sleep Monitoring (DP11-DP17)
            "bed_status": "in_bed" if runtime_config["sleep_monitor_enabled"] else "none",
            "sleep_status": ("deep" if body_move < 12 else "light") if runtime_config["sleep_monitor_enabled"] else "none",
            "awake_minutes": 32,
            "light_sleep_minutes": 185,
            "deep_sleep_minutes": 142,
            "sleep_score": 88.0,
            "sleep_rating": "good",
            "turn_over_count": 4,
            "large_body_move_ratio": 7.5,
            "small_body_move_ratio": 16.0,
            "apnea_count": 0,
            "sleep_anomaly": "none",

            # R60ABD2 Alarms (DP18/DP19)
            "struggle_alarm": struggle,
            "unattended_alarm": unattended,
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(READINGS_ENDPOINT, data=data, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, data=data, context=ssl_context, timeout=8) as response:
                status = response.status
                hr_disp = f"{payload['heart_rate']} bpm" if payload['heart_rate'] else "OFF"
                rr_disp = f"{payload['respiratory_rate']} brpm" if payload['respiratory_rate'] else "OFF"
                print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] #{seq:03d} -> Sent: HR={hr_disp}, RR={rr_disp}, Dist={payload['distance_cm']}cm, Move={payload['body_movement']}%, Sleep={payload['sleep_status']} (HTTP {status})")
                seq += 1
        except urllib.error.HTTPError as e:
            print(f"[!] HTTP Error {e.code}: {e.read().decode('utf-8')}")
        except Exception as e:
            print(f"[!] Network Error: {e}")

        time.sleep(interval)

except KeyboardInterrupt:
    print("\n[*] Simulator stopped by user.")
