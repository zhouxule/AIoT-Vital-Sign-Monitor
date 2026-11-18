# =============================================================================
# ESP32-S3 Mock Ingestion Simulator for PowerShell
# Corresponds to Section 6 of 20261108.md
# =============================================================================

$SupabaseUrl = "https://xfmpvxivuhakegkngnff.supabase.co"
$ApiKey = "sb_publishable_-Ad2aOwrXwyy6gmnWY2Yfg_bmf6-U2j"
$Endpoint = "$SupabaseUrl/rest/v1/sensor_readings"
$DeviceId = "esp32_prototype_01"

$Headers = @{
    "apikey" = $ApiKey
    "Authorization" = "Bearer $ApiKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

$hr = 74.0
$rr = 16.0
$temp = 24.5
$humidity = 52.0
$bodyTemp = 36.6

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "[*] Starting ESP32-S3 Simulation Script (PowerShell)" -ForegroundColor Green
Write-Host "[*] Target Cloud DB: $SupabaseUrl"
Write-Host "[*] Device ID: $DeviceId"
Write-Host "[*] Sending vital sign payload every 3s... Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host "================================================================="

$seq = 1

while ($true) {
    # Random drift
    $hr = [Math]::Max(58.0, [Math]::Min(105.0, $hr + (Get-Random -Minimum -15 -Maximum 15) / 10.0))
    $rr = [Math]::Max(12.0, [Math]::Min(22.0, $rr + (Get-Random -Minimum -5 -Maximum 5) / 10.0))
    $temp = [Math]::Max(21.0, [Math]::Min(27.0, $temp + (Get-Random -Minimum -1 -Maximum 1) / 10.0))
    $humidity = [Math]::Max(40.0, [Math]::Min(65.0, $humidity + (Get-Random -Minimum -4 -Maximum 4) / 10.0))

    $curHr = [Math]::Round($hr, 1)
    if ((Get-Random -Minimum 1 -Maximum 100) -le 4) {
        $curHr = [Math]::Round(110.0 + (Get-Random -Minimum 0 -Maximum 180) / 10.0, 1)
    }

    $payload = @{
        "device_id" = $DeviceId
        "recorded_at" = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        "heart_rate" = $curHr
        "respiratory_rate" = [Math]::Round($rr, 1)
        "ambient_temperature" = [Math]::Round($temp, 1)
        "humidity" = [Math]::Round($humidity, 1)
        "body_surface_temperature" = [Math]::Round($bodyTemp, 1)
        "presence" = $true
        "temperature_valid" = $true
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri $Endpoint -Headers $Headers -Method Post -Body $payload
        $nowStr = (Get-Date).ToString("HH:mm:ss")
        Write-Host "[$nowStr] #$("{0:D3}" -f $seq) -> Sent: HR=$curHr bpm, RR=$([Math]::Round($rr, 1)) brpm, Temp=$([Math]::Round($temp, 1))°C (HTTP 201)" -ForegroundColor Green
        $seq++
    } catch {
        Write-Host "[!] Send Failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Start-Sleep -Seconds 3
}
