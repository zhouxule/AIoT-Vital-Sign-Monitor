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
} from 'lucide-react'
import type { DeviceConfig, DeviceStatus } from '@/types'

// Standard R60ABD2 UART protocol commands (Section 8.2 of Datasheet)
const R60ABD2_COMMANDS = [
  { name: '存在信息查询', cmd: '53 59 80 81 00 01 0F BD 54 43', desc: '查询当前是否检测到人体存在 (DP1)' },
  { name: '运动信息查询', cmd: '53 59 80 82 00 01 0F BE 54 43', desc: '查询当前运动状态：静止/活跃 (DP2)' },
  { name: '体动参数查询', cmd: '53 59 80 83 00 01 0F BF 54 43', desc: '查询当前体动幅度 0~100 (DP4)' },
  { name: '人体距离查询', cmd: '53 59 80 84 00 01 0F C0 54 43', desc: '查询雷达测距数据 0~65535 cm (DP3)' },
  { name: '心率数值查询', cmd: '53 59 85 82 00 01 0F C3 54 43', desc: '查询实时心跳数值 60~120 bpm (DP6)' },
  { name: '呼吸数值查询', cmd: '53 59 81 82 00 01 0F BF 54 43', desc: '查询实时呼吸数值 0~35 次/min (DP8)' },
  { name: '心率波形开关', cmd: '53 59 85 0A 00 01 01 40 54 43', desc: '开启/关闭心率波形实时上报 (DP7)' },
  { name: '呼吸波形开关', cmd: '53 59 81 0C 00 01 01 3E 54 43', desc: '开启/关闭呼吸波形实时上报 (DP10)' },
  { name: '在床状态查询', cmd: '53 59 84 81 00 01 0F C1 54 43', desc: '查询当前入床/离床状态 (DP11)' },
  { name: '睡眠状态查询', cmd: '53 59 84 82 00 01 0F C2 54 43', desc: '查询睡眠阶段：深睡/浅睡/清醒 (DP12)' },
  { name: '睡眠评分查询', cmd: '53 59 84 86 00 01 0F C6 54 43', desc: '查询整晚睡眠质量评分 0~100 (DP14)' },
  { name: '异常挣扎状态查询', cmd: '53 59 84 91 00 01 0F D1 54 43', desc: '查询异常体动挣扎/跌倒起伏 (DP18)' },
  { name: '模组系统复位', cmd: '53 59 01 02 00 01 0F AE 54 43', desc: '复位并重新初始化 R60ABD2 雷达模组' },
  { name: '固件版本查询', cmd: '53 59 02 A4 00 01 0F 50 54 43', desc: '查询 R60ABD2 雷达固件版本 (V3.5)' },
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

  // Sync state if remote config changes
  useEffect(() => {
    setForm({ ...deviceConfig })
  }, [deviceConfig])

  const handleSave = async () => {
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Device Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-muted-foreground" />
              <CardTitle>硬件与固件状态 (Device Status)</CardTitle>
            </div>
            <CardDescription>
              基于 R60ABD2 毫米波微动睡眠雷达模块及 ESP32-S3 主控
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">设备标识 (Device ID)</span>
              <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                {deviceStatus.device_id}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">雷达型号 (Radar Model)</span>
              <Badge variant="outline" className="font-semibold text-primary border-primary/40">
                {deviceStatus.hardware_model || 'R60ABD2'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">雷达协议版本</span>
              <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                {deviceStatus.firmware_version || 'V3.5 (MicRadar)'}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">连接状态</span>
              <Badge variant={deviceStatus.is_online ? 'default' : 'destructive'}>
                {deviceStatus.is_online ? '在线 (Cloud Synced)' : '离线 (Offline)'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">最近双向同步时间</span>
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
              <CardTitle>云端同步参数 (Cloud Shadow Sync)</CardTitle>
            </div>
            <CardDescription>
              控制 ESP32 主控与 Supabase 云端的采集频率与网络参数
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="sample-interval" className="text-sm font-medium">
                ESP32 采样上报周期 (秒)
              </label>
              <Input
                id="sample-interval"
                type="number"
                min={1}
                max={60}
                value={form.sample_interval_seconds}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  sample_interval_seconds: Math.max(1, Math.min(60, Number(e.target.value) || 3))
                }))}
              />
              <p className="text-xs text-muted-foreground">
                ESP32 每次通过 HTTPS 向 Supabase POST 数据的间隔（建议 2~5 秒，兼顾实时性与功耗）。
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="text-sm font-medium">实时多普勒波形上传 (DP7/DP10)</p>
                <p className="text-xs text-muted-foreground">开启后在概览页实时展示 5Hz 心率与呼吸连续曲线</p>
              </div>
              <Switch
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
              <CardTitle>R60ABD2 雷达功能开关 (DP 控制)</CardTitle>
            </div>
            <CardDescription>
              根据 R60ABD2 用户手册配置雷达内置传感与微动算法
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Radar main switch */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Radio className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="text-sm font-medium">R60ABD2 雷达总开关</p>
                  <p className="text-xs text-muted-foreground">心率/呼吸/体动基础感知通道</p>
                </div>
              </div>
              <Switch
                checked={form.radar_enabled}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, radar_enabled: v }))}
              />
            </div>

            {/* Sleep monitor */}
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-sm font-medium">睡眠监测功能 (DP11 - DP17)</p>
                  <p className="text-xs text-muted-foreground">在床/离床探测、深浅睡分析、夜间翻身统计</p>
                </div>
              </div>
              <Switch
                checked={form.sleep_monitor_enabled}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, sleep_monitor_enabled: v }))}
              />
            </div>

            {/* SHT31 & MLX90640 */}
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-3">
                <Droplets className="h-5 w-5 text-cyan-500" />
                <div>
                  <p className="text-sm font-medium">SHT31 温湿度环境传感器</p>
                  <p className="text-xs text-muted-foreground">I²C 接口高精度环境监测</p>
                </div>
              </div>
              <Switch
                checked={form.sht31_enabled}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, sht31_enabled: v }))}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-3">
                <Thermometer className="h-5 w-5 text-rose-500" />
                <div>
                  <p className="text-sm font-medium">MLX90640 阵列红外热像仪</p>
                  <p className="text-xs text-muted-foreground">非接触式人体表面温度矩阵</p>
                </div>
              </div>
              <Switch
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
              <CardTitle>智能安全报警设置 (DP18 & DP19)</CardTitle>
            </div>
            <CardDescription>
              设置跌倒挣扎报警灵敏度与无人超时预警阈值
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Struggle alarm */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">异常挣扎报警开关 (DP18)</p>
                  <p className="text-xs text-muted-foreground">跌倒后的大幅挣扎或剧烈翻滚异常监测</p>
                </div>
                <Switch
                  checked={form.struggle_alarm_enabled}
                  onCheckedChange={(v) => setForm((prev) => ({ ...prev, struggle_alarm_enabled: v }))}
                />
              </div>

              {form.struggle_alarm_enabled && (
                <div className="flex items-center justify-between pl-4 border-l-2 border-amber-500/30">
                  <span className="text-xs font-medium">挣扎判读灵敏度 (DP1A)</span>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={form.struggle_sensitivity}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      struggle_sensitivity: e.target.value as 'low' | 'medium' | 'high'
                    }))}
                  >
                    <option value="low">低灵敏度 (0x00)</option>
                    <option value="medium">中灵敏度 (0x01 默认)</option>
                    <option value="high">高灵敏度 (0x02)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Unattended alarm */}
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">无人超时滞留报警 (DP19)</p>
                  <p className="text-xs text-muted-foreground">长者离床或离开监护区域超时自动预警</p>
                </div>
                <Switch
                  checked={form.unattended_alarm_enabled}
                  onCheckedChange={(v) => setForm((prev) => ({ ...prev, unattended_alarm_enabled: v }))}
                />
              </div>

              {form.unattended_alarm_enabled && (
                <div className="flex items-center justify-between pl-4 border-l-2 border-indigo-500/30">
                  <span className="text-xs font-medium">超时时长阈值 (DP15)</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
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
                    <span className="text-xs text-muted-foreground">分钟</span>
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
          {saving ? '保存至 Supabase...' : '保存配置 (Sync to Cloud)'}
        </Button>
        {savedSuccess && (
          <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
            <Check className="h-4 w-4" /> 配置已同步至云端 device_configs 表！ESP32 下次拉取时将自动生效。
          </span>
        )}
      </div>

      {/* R60ABD2 Serial Command & Protocol Reference Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <CardTitle>R60ABD2 串口通信指令字典 (UART Protocol Quick Reference)</CardTitle>
          </div>
          <CardDescription>
            源自《R60ABD2 用户手册 V3.5》标准帧格式 (波特率: 115200 8N1，帧头: 0x53 0x59，帧尾: 0x54 0x43)。
            可直接点击复制十六进制指令，在串口调试助手或 ESP32 代码中发送测试。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">功能名称</th>
                  <th className="pb-2 pr-4 font-medium">说明解释</th>
                  <th className="pb-2 pr-4 font-medium">十六进制指令 (HEX Payload)</th>
                  <th className="pb-2 text-right font-medium">快捷操作</th>
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
                            <Check className="h-3 w-3" /> 已复制
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Copy className="h-3 w-3" /> 复制 HEX
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
    </div>
  )
}
