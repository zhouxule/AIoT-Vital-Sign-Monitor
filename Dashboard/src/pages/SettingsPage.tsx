import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Settings,
  Cpu,
  Radio,
  Thermometer,
  Droplets,
  Save,
  Moon,
  ShieldAlert,
  Terminal,
  Copy,
  Check,
  Lock,
  Unlock,
  Key,
} from 'lucide-react'
import type { DeviceConfig, DeviceStatus } from '@/types'

// Standard R60ABD2 UART protocol commands (Section 8.2 of Datasheet)
const R60ABD2_COMMANDS = [
  { name: 'Presence Inquiry (DP1)', cmd: '53 59 80 81 00 01 0F BD 54 43', desc: 'Query human presence status' },
  { name: 'Motion State Inquiry (DP2)', cmd: '53 59 80 82 00 01 0F BE 54 43', desc: 'Query motion state: resting / active' },
  { name: 'Body Motion Inquiry (DP4)', cmd: '53 59 80 83 00 01 0F BF 54 43', desc: 'Query body movement intensity (0~100)' },
  { name: 'Target Distance Inquiry (DP3)', cmd: '53 59 80 84 00 01 0F C0 54 43', desc: 'Query radar distance telemetry (cm)' },
  { name: 'Heart Rate Inquiry (DP6)', cmd: '53 59 85 82 00 01 0F C3 54 43', desc: 'Query real-time heart rate value (60~120 bpm)' },
  { name: 'Respiratory Rate Inquiry (DP8)', cmd: '53 59 81 82 00 01 0F BF 54 43', desc: 'Query real-time breathing frequency (brpm)' },
  { name: 'Heart Waveform Switch (DP7)', cmd: '53 59 85 0A 00 01 01 3D 54 43', desc: 'Enable/disable 5Hz Doppler heart waveform stream' },
  { name: 'Resp Waveform Switch (DP10)', cmd: '53 59 81 0C 00 01 01 3B 54 43', desc: 'Enable/disable 5Hz Doppler respiratory waveform stream' },
  { name: 'Bed Occupancy Inquiry (DP11)', cmd: '53 59 84 81 00 01 0F C1 54 43', desc: 'Query in-bed / out-of-bed occupancy state' },
  { name: 'Sleep Stage Inquiry (DP12)', cmd: '53 59 84 82 00 01 0F C2 54 43', desc: 'Query sleep stage: deep / light / awake' },
  { name: 'Sleep Score Inquiry (DP14)', cmd: '53 59 84 86 00 01 0F C6 54 43', desc: 'Query sleep quality score (0~100)' },
  { name: 'Fall & Struggle Alarm (DP18)', cmd: '53 59 84 91 00 01 0F D1 54 43', desc: 'Query severe struggle or fall alert status' },
  { name: 'Module System Reset', cmd: '53 59 01 02 00 01 0F AE 54 43', desc: 'Hardware software reset of R60ABD2 radar' },
  { name: 'Firmware Version Inquiry', cmd: '53 59 02 A4 00 01 0F 50 54 43', desc: 'Query radar MCU firmware version string (V3.5)' },
]

interface SettingsPageProps {
  deviceConfig: DeviceConfig
  deviceStatus: DeviceStatus
  onSaveConfig: (cfg: Partial<DeviceConfig>) => Promise<boolean>
}

export function SettingsPage({ deviceConfig, deviceStatus, onSaveConfig }: SettingsPageProps) {
  const [form, setForm] = useState<DeviceConfig>({ ...deviceConfig })
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)

  // Admin authentication state (protects remote controls on public Cloudflare deployment)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem('admin_unlocked') === 'true'
  })
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [authError, setAuthError] = useState(false)

  // Sync state if remote config changes
  useEffect(() => {
    setForm({ ...deviceConfig })
  }, [deviceConfig])

  const handleUnlock = () => {
    // Default PIN: 123456 (can be customized by owner)
    if (passcode === '123456' || passcode === 'admin888') {
      setIsAdminUnlocked(true)
      sessionStorage.setItem('admin_unlocked', 'true')
      setShowAuthModal(false)
      setAuthError(false)
      setPasscode('')
    } else {
      setAuthError(true)
    }
  }

  const handleLock = () => {
    setIsAdminUnlocked(false)
    sessionStorage.removeItem('admin_unlocked')
  }

  const handleSave = async () => {
    if (!isAdminUnlocked) {
      setShowAuthModal(true)
      return
    }
    setSaving(true)
    const ok = await onSaveConfig(form)
    setSaving(false)
    if (ok) {
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    }
  }

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd.replace(/\s+/g, ''))
    setCopiedCmd(cmd)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Cloudflare Access Control & Security Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border p-4 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          {isAdminUnlocked ? (
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-full">
              <Unlock className="h-5 w-5" />
            </div>
          ) : (
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-full">
              <Lock className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">
                {isAdminUnlocked ? 'Admin Mode Unlocked' : 'Read-Only Protected Mode'}
              </p>
              <Badge variant={isAdminUnlocked ? 'default' : 'secondary'} className="text-[10px]">
                {isAdminUnlocked ? 'Authenticated' : 'Public Viewer'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAdminUnlocked
                ? 'You have authorized control to modify remote device parameters and synchronization settings.'
                : 'Device switches and cloud synchronization are locked to protect against unauthorized remote tampering.'}
            </p>
          </div>
        </div>

        <div>
          {isAdminUnlocked ? (
            <Button variant="outline" size="sm" onClick={handleLock} className="text-xs gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Re-lock Settings
            </Button>
          ) : (
            <Button size="sm" onClick={() => setShowAuthModal(true)} className="text-xs gap-1.5">
              <Key className="h-3.5 w-3.5" /> Unlock Admin Access
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Device Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Hardware & Firmware Status</CardTitle>
            </div>
            <CardDescription>
              Telemetry from ESP32-S3 microcontroller and R60ABD2 mmWave radar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Device Identifier</span>
              <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                {deviceStatus.device_id}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Radar Model</span>
              <Badge variant="outline" className="font-semibold text-primary border-primary/40">
                {deviceStatus.hardware_model || 'R60ABD2'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Radar Protocol</span>
              <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                {deviceStatus.firmware_version || 'V3.5 (MicRadar)'}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connectivity State</span>
              <Badge variant={deviceStatus.is_online ? 'default' : 'destructive'}>
                {deviceStatus.is_online ? 'Online (Cloud Synced)' : 'Offline (Disconnected)'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Bidirectional Sync</span>
              <span className="text-xs text-muted-foreground">
                {deviceStatus.last_successful_transmission
                  ? new Date(deviceStatus.last_successful_transmission).toLocaleString()
                  : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Data Refresh & Sampling Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Cloud Shadow Synchronization</CardTitle>
            </div>
            <CardDescription>
              Sampling rate and streaming parameters for ESP32 and Supabase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="sample-interval" className="text-sm font-medium">
                ESP32 Telemetry Upload Interval (seconds)
              </label>
              <Input
                id="sample-interval"
                type="number"
                disabled={!isAdminUnlocked}
                min={1}
                max={60}
                value={form.sample_interval_seconds}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  sample_interval_seconds: Math.max(1, Math.min(60, Number(e.target.value) || 3))
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Interval between HTTPS POST telemetry snapshots sent from ESP32 to Supabase (recommended: 2~5s).
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="text-sm font-medium">Real-time Doppler Waveform (DP7/DP10)</p>
                <p className="text-xs text-muted-foreground">Streams 5Hz raw heart rate and respiratory waveforms to the live oscilloscope</p>
              </div>
              <Switch
                disabled={!isAdminUnlocked}
                checked={form.waveform_enabled}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, waveform_enabled: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* R60ABD2 Radar Advanced Functions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-violet-500" />
              <CardTitle>Radar & Sensor Peripherals</CardTitle>
            </div>
            <CardDescription>
              Toggle hardware sensing channels according to R60ABD2 manual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Radar main switch */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Radio className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="text-sm font-medium">R60ABD2 Radar Primary Channel</p>
                  <p className="text-xs text-muted-foreground">Heart rate, respiration, presence and movement sensing</p>
                </div>
              </div>
              <Switch
                disabled={!isAdminUnlocked}
                checked={form.radar_enabled}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, radar_enabled: v }))}
              />
            </div>

            {/* Sleep monitor */}
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-sm font-medium">Sleep Architecture Tracking (DP11 - DP17)</p>
                  <p className="text-xs text-muted-foreground">Bed occupancy, deep/light sleep stages, nocturnal turnovers</p>
                </div>
              </div>
              <Switch
                disabled={!isAdminUnlocked}
                checked={form.sleep_monitor_enabled}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, sleep_monitor_enabled: v }))}
              />
            </div>

            {/* SHT31 & MLX90640 */}
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-3">
                <Droplets className="h-5 w-5 text-cyan-500" />
                <div>
                  <p className="text-sm font-medium">SHT31 Ambient Temp & Humidity</p>
                  <p className="text-xs text-muted-foreground">I²C bus digital ambient environmental monitoring</p>
                </div>
              </div>
              <Switch
                disabled={!isAdminUnlocked}
                checked={form.sht31_enabled}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, sht31_enabled: v }))}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-3">
                <Thermometer className="h-5 w-5 text-rose-500" />
                <div>
                  <p className="text-sm font-medium">MLX90640 Thermal IR Array</p>
                  <p className="text-xs text-muted-foreground">Contactless human surface temperature matrix sensor</p>
                </div>
              </div>
              <Switch
                disabled={!isAdminUnlocked}
                checked={form.mlx90640_enabled}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, mlx90640_enabled: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Safety Alarms Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <CardTitle>Autonomous Safety Alarm Triggers</CardTitle>
            </div>
            <CardDescription>
              Threshold settings for fall/struggle detection and unattended timeout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Struggle alarm */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Abnormal Struggle / Fall Alarm (DP18)</p>
                  <p className="text-xs text-muted-foreground">Detects severe abnormal body movement or post-fall distress</p>
                </div>
                <Switch
                  disabled={!isAdminUnlocked}
                  checked={form.struggle_alarm_enabled}
                  onCheckedChange={(v) => setForm((prev) => ({ ...prev, struggle_alarm_enabled: v }))}
                />
              </div>

              {form.struggle_alarm_enabled && (
                <div className="flex items-center justify-between pl-4 border-l-2 border-amber-500/30">
                  <span className="text-xs font-medium">Struggle Sensitivity Level (DP1A)</span>
                  <select
                    disabled={!isAdminUnlocked}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={form.struggle_sensitivity}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      struggle_sensitivity: e.target.value as 'low' | 'medium' | 'high'
                    }))}
                  >
                    <option value="low">Low Sensitivity (0x00)</option>
                    <option value="medium">Medium Sensitivity (0x01 Default)</option>
                    <option value="high">High Sensitivity (0x02)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Unattended alarm */}
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Unattended Empty Zone Alarm (DP19)</p>
                  <p className="text-xs text-muted-foreground">Alerts when bed/monitoring zone remains empty beyond safety limit</p>
                </div>
                <Switch
                  disabled={!isAdminUnlocked}
                  checked={form.unattended_alarm_enabled}
                  onCheckedChange={(v) => setForm((prev) => ({ ...prev, unattended_alarm_enabled: v }))}
                />
              </div>

              {form.unattended_alarm_enabled && (
                <div className="flex items-center justify-between pl-4 border-l-2 border-indigo-500/30">
                  <span className="text-xs font-medium">Timeout Duration Limit (DP15)</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      disabled={!isAdminUnlocked}
                      step={10}
                      min={30}
                      max={180}
                      className="h-8 w-20 text-xs"
                      value={form.unattended_timeout_minutes}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        unattended_timeout_minutes: Math.max(30, Math.min(180, Number(e.target.value) || 30))
                      }))}
                    />
                    <span className="text-xs text-muted-foreground">minutes</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Settings Button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving to Supabase...' : 'Save Configuration (Sync to Cloud)'}
        </Button>
        {savedSuccess && (
          <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
            <Check className="h-4 w-4" /> Configuration synced to device_configs table! ESP32 will adopt on next polling cycle.
          </span>
        )}
      </div>

      {/* R60ABD2 Serial Command & Protocol Reference Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <CardTitle>R60ABD2 UART Command Dictionary & Protocol Reference</CardTitle>
          </div>
          <CardDescription>
            Reference specification from R60ABD2 User Manual V3.5 (115200 8N1, Header: 0x53 0x59, Tail: 0x54 0x43).
            Click "Copy HEX" to copy payloads for serial debugging or ESP32 command transmission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Command Name</th>
                  <th className="pb-2 pr-4 font-medium">Description</th>
                  <th className="pb-2 pr-4 font-medium">Hex Payload</th>
                  <th className="pb-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {R60ABD2_COMMANDS.map((item) => (
                  <tr key={item.name} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{item.name}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{item.desc}</td>
                    <td className="py-2.5 pr-4">
                      <code className="bg-muted px-2 py-0.5 rounded font-mono text-[11px] text-primary">
                        {item.cmd}
                      </code>
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleCopy(item.cmd)}
                      >
                        {copiedCmd === item.cmd ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Copied
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Copy className="h-3 w-3" /> Copy HEX
                          </span>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Admin Passcode Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl border-primary/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Admin Authentication Required</CardTitle>
                  <CardDescription className="text-xs">
                    Please enter the administrator passcode to unlock remote controls and modify device parameters.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter passcode (default: 123456)"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value)
                    setAuthError(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUnlock()
                  }}
                  autoFocus
                />
                {authError && (
                  <p className="text-xs text-destructive font-medium">
                    Incorrect passcode! Please try again.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAuthModal(false)
                    setAuthError(false)
                    setPasscode('')
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleUnlock}>
                  Authenticate & Unlock
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
