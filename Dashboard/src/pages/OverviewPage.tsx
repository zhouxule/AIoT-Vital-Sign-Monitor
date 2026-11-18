import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  Wind,
  Thermometer,
  Droplets,
  UserCheck,
  UserX,
  Brain,
  Activity,
  Bed,
  Moon,
  AlertTriangle,
  Compass,
  Gauge,
  Waves,
} from 'lucide-react'
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { formatTimestamp, getStatusColor } from '@/lib/utils'
import type { SensorReading, AIPrediction } from '@/types'

// ---------------------------------------------------------------------------
// Vital sign card component
// ---------------------------------------------------------------------------

interface VitalCardProps {
  title: string
  value: number | string | null
  unit: string
  icon: React.ReactNode
  color: string
  sparklineData: { v: number | null }[]
  sparklineColor: string
  normalMin?: number
  normalMax?: number
  subtitle?: string
}

function VitalCard({
  title,
  value,
  unit,
  icon,
  color,
  sparklineData,
  sparklineColor,
  normalMin,
  normalMax,
  subtitle,
}: VitalCardProps) {
  const statusColor =
    typeof value === 'number' && normalMin !== undefined && normalMax !== undefined
      ? getStatusColor(value, normalMin, normalMax)
      : value === null
        ? 'text-muted-foreground'
        : 'text-emerald-500'

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={color}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${statusColor}`}>
            {value !== null && value !== undefined ? value : 'N/A'}
          </span>
          {value !== null && value !== undefined && (
            <span className="text-sm text-muted-foreground">{unit}</span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground truncate">{subtitle}</p>
        )}

        {/* Sparkline */}
        <div className="mt-3 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`grad-${title.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={sparklineColor} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparklineColor}
                strokeWidth={1.5}
                fill={`url(#grad-${title.replace(/[^a-zA-Z0-9]/g, '')})`}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Overview Page
// ---------------------------------------------------------------------------

interface OverviewPageProps {
  readings: SensorReading[]
  currentReading: SensorReading
  predictions: AIPrediction[]
}

export function OverviewPage({ readings, currentReading, predictions }: OverviewPageProps) {
  const current = currentReading
  const latestPrediction = predictions[0] ?? {
    prediction: 'normal',
    anomaly_score: 0.05,
    recorded_at: new Date().toISOString(),
  }

  // Sparklines data (last 20 readings)
  const recentSlice = readings.slice(-20)
  const hrData = recentSlice.map((r) => ({ v: r.heart_rate }))
  const rrData = recentSlice.map((r) => ({ v: r.respiratory_rate }))
  const tempData = recentSlice.map((r) => ({ v: r.ambient_temperature }))
  const humData = recentSlice.map((r) => ({ v: r.humidity }))
  const bodyTempData = recentSlice.map((r) => ({ v: r.body_surface_temperature }))
  const moveData = recentSlice.map((r) => ({ v: r.body_movement }))
  const distData = recentSlice.map((r) => ({ v: r.distance_cm }))

  // Assemble continuous real-time waveform from recent readings
  const waveformChartData = useMemo(() => {
    const points: { idx: number; hrWave: number; rrWave: number }[] = []
    const lastFew = readings.slice(-6)
    let pIdx = 0
    lastFew.forEach((r) => {
      const hrArr = r.heart_rate_waveform || [128, 128, 128, 128, 128]
      const rrArr = r.respiratory_waveform || [128, 128, 128, 128, 128]
      for (let i = 0; i < 5; i++) {
        points.push({
          idx: pIdx++,
          hrWave: hrArr[i] ?? 128,
          rrWave: rrArr[i] ?? 128,
        })
      }
    })
    return points
  }, [readings])

  // Last 10 readings for table
  const tableReadings = [...readings].reverse().slice(0, 10)

  // Sleep status text helper
  const getSleepText = (status: SensorReading['sleep_status']) => {
    switch (status) {
      case 'deep': return '深睡 (Deep)'
      case 'light': return '浅睡 (Light)'
      case 'awake': return '清醒 (Awake)'
      case 'out_bed': return '已离床 (Out)'
      default: return '未探测'
    }
  }

  return (
    <div className="space-y-6">
      {/* Safety Alert Banner (DP18 异常挣扎 & DP19 无人超时) */}
      {(current.struggle_alarm || current.unattended_alarm) ? (
        <div className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-700 dark:text-red-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse" />
            <div>
              <p className="font-semibold text-base">R60ABD2 雷达告警触发！</p>
              <p className="text-sm">
                {current.struggle_alarm && '【DP18 异常挣扎/跌倒预警】检测到大幅度异常体动与起伏波动！ '}
                {current.unattended_alarm && '【DP19 无人计时预警】监测区域无人超时，请及时核实被监护人状态！'}
              </p>
            </div>
          </div>
          <Badge variant="destructive" className="animate-pulse">紧急预警</Badge>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>R60ABD2 雷达安全监护正常运行：未检测到异常挣扎或超时无人。</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">DP18 挣扎监测：开启</Badge>
            <Badge variant="outline" className="text-xs">DP19 无人计时：开启</Badge>
          </div>
        </div>
      )}

      {/* Main Vital & Radar Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7">
        <VitalCard
          title="Heart Rate"
          value={current.heart_rate}
          unit="bpm"
          icon={<Heart className="h-5 w-5" />}
          color="text-red-500"
          sparklineData={hrData}
          sparklineColor="#ef4444"
          normalMin={60}
          normalMax={100}
          subtitle="DP6 雷达实时心率"
        />
        <VitalCard
          title="Respiratory Rate"
          value={current.respiratory_rate}
          unit="brpm"
          icon={<Wind className="h-5 w-5" />}
          color="text-blue-500"
          sparklineData={rrData}
          sparklineColor="#3b82f6"
          normalMin={12}
          normalMax={20}
          subtitle="DP8 雷达实时呼吸"
        />
        <VitalCard
          title="Body Movement"
          value={current.body_movement}
          unit="%"
          icon={<Activity className="h-5 w-5" />}
          color="text-amber-500"
          sparklineData={moveData}
          sparklineColor="#f59e0b"
          normalMin={0}
          normalMax={50}
          subtitle={`DP4 体动参数 (${current.motion_status === 'active' ? '活跃' : '静止'})`}
        />
        <VitalCard
          title="Target Distance"
          value={current.distance_cm}
          unit="cm"
          icon={<Compass className="h-5 w-5" />}
          color="text-indigo-500"
          sparklineData={distData}
          sparklineColor="#6366f1"
          normalMin={50}
          normalMax={300}
          subtitle={current.position_xyz ? `X:${current.position_xyz.x} Y:${current.position_xyz.y} cm` : 'DP3 雷达测距'}
        />
        <VitalCard
          title="Ambient Temp"
          value={current.ambient_temperature}
          unit="°C"
          icon={<Thermometer className="h-5 w-5" />}
          color="text-orange-500"
          sparklineData={tempData}
          sparklineColor="#f97316"
          normalMin={18}
          normalMax={30}
          subtitle="SHT31 环境温度"
        />
        <VitalCard
          title="Humidity"
          value={current.humidity}
          unit="%"
          icon={<Droplets className="h-5 w-5" />}
          color="text-cyan-500"
          sparklineData={humData}
          sparklineColor="#06b6d4"
          normalMin={30}
          normalMax={70}
          subtitle="SHT31 相对湿度"
        />
        <VitalCard
          title="Body Temp (IR)"
          value={current.body_surface_temperature}
          unit="°C"
          icon={<Thermometer className="h-5 w-5" />}
          color="text-rose-500"
          sparklineData={bodyTempData}
          sparklineColor="#f43f5e"
          normalMin={35.8}
          normalMax={37.4}
          subtitle="MLX90640 红外体表温"
        />
      </div>

      {/* R60ABD2 Real-time Radar Bio-Waveform Oscilloscope (DP7 & DP10) */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <div className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                R60ABD2 实时毫米波生物波形示波器 (Real-time Bio-Radar Waveform)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              DP7 心率波形与 DP10 呼吸波形曲线 (每秒 5 采样点原始微多普勒解调数据，基准中轴线: 128)
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-muted-foreground">心率波形 (DP7)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">呼吸波形 (DP10)</span>
            </div>
            <Badge variant="outline" className="text-xs font-mono">1s / 5Hz</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full bg-slate-950/5 dark:bg-slate-950/40 rounded-lg p-2 border">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waveformChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                <XAxis dataKey="idx" hide />
                <YAxis domain={[60, 200]} ticks={[80, 128, 170]} width={35} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '6px', fontSize: '11px' }}
                  formatter={(value: any, name: any) => [
                    `${value} (偏离 ${(Number(value) - 128).toFixed(0)})`,
                    name === 'hrWave' ? '心率多普勒强度' : '呼吸位移幅度'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="hrWave"
                  name="hrWave"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="rrWave"
                  name="rrWave"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* R60ABD2 Sleep & State Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sleep Monitoring (DP11-DP17) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              睡眠与在床监测 (DP11 - DP17)
            </CardTitle>
            <Moon className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">在床状态 (DP11)</span>
              <Badge variant={current.bed_status === 'in_bed' ? 'default' : 'secondary'}>
                <Bed className="mr-1 h-3 w-3" />
                {current.bed_status === 'in_bed' ? '已入床 (In Bed)' : '离床 (Out Bed)'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">睡眠阶段 (DP12)</span>
              <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                {getSleepText(current.sleep_status)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">睡眠评分 (DP14/DP20)</span>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold">{current.sleep_score ?? 88} 分</span>
                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/40">
                  {current.sleep_rating === 'good' ? '良好' : '正常'}
                </Badge>
              </div>
            </div>
            <div className="pt-2 border-t grid grid-cols-3 text-center text-xs text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">{current.deep_sleep_minutes ?? 140}m</p>
                <p className="text-[10px]">深睡时长</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">{current.light_sleep_minutes ?? 175}m</p>
                <p className="text-[10px]">浅睡时长</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">{current.turn_over_count ?? 4}次</p>
                <p className="text-[10px]">夜间翻身</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Presence & Motion Tracking (DP1-DP5) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              毫米波空间感应 (DP1 - DP5)
            </CardTitle>
            <Gauge className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">目标存在 (DP1)</span>
              <Badge variant={current.presence ? 'default' : 'secondary'}>
                {current.presence ? (
                  <><UserCheck className="mr-1 h-3 w-3 text-emerald-300" /> 检测有人</>
                ) : (
                  <><UserX className="mr-1 h-3 w-3" /> 无人</>
                )}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">微动模式 (DP2)</span>
              <span className="text-sm font-medium">
                {current.motion_status === 'active' ? '人体活跃 (Active)' : current.motion_status === 'motionless' ? '人体静止 (Resting)' : '无目标'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">目标探测距离 (DP3)</span>
              <span className="text-sm font-semibold">{current.distance_cm ?? 145} cm</span>
            </div>
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>体动幅度能量 (DP4)</span>
                <span>{current.body_movement ?? 12} / 100</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, current.body_movement ?? 12)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Model Output */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              边缘 AI 异常识别分析
            </CardTitle>
            <Brain className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">部署模型</span>
              <Badge variant="outline" className="font-mono text-xs">Random Forest v1.2.0</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">当前研判</span>
              <Badge
                variant={latestPrediction.prediction === 'normal' ? 'default' : 'destructive'}
                className="capitalize"
              >
                {latestPrediction.prediction.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">异常偏离评分</span>
              <span className="text-lg font-bold">
                {latestPrediction.anomaly_score !== null ? latestPrediction.anomaly_score.toFixed(2) : '0.08'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t">
              说明：结合心率、体动与呼吸时序特征进行离群点度量，非临床医疗诊断。
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent measurements table */}
      <Card>
        <CardHeader>
          <CardTitle>最近读数日志 (Multi-Sensor Readings)</CardTitle>
          <CardDescription>结合 R60ABD2 雷达生理、体动、睡眠及环境温湿度的综合时序记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">时间戳</th>
                  <th className="pb-2 pr-3 font-medium">心率 (bpm)</th>
                  <th className="pb-2 pr-3 font-medium">呼吸 (brpm)</th>
                  <th className="pb-2 pr-3 font-medium">体动</th>
                  <th className="pb-2 pr-3 font-medium">测距 (cm)</th>
                  <th className="pb-2 pr-3 font-medium">在床状态</th>
                  <th className="pb-2 pr-3 font-medium">睡眠阶段</th>
                  <th className="pb-2 pr-3 font-medium">环境温湿度</th>
                  <th className="pb-2 pr-3 font-medium">红外体表温</th>
                </tr>
              </thead>
              <tbody>
                {tableReadings.map((r: SensorReading) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2.5 pr-3 text-muted-foreground font-mono text-xs">
                      {formatTimestamp(r.recorded_at)}
                    </td>
                    <td className={`py-2.5 pr-3 font-medium ${getStatusColor(r.heart_rate, 60, 100)}`}>
                      {r.heart_rate ?? '—'}
                    </td>
                    <td className={`py-2.5 pr-3 font-medium ${getStatusColor(r.respiratory_rate, 12, 20)}`}>
                      {r.respiratory_rate ?? '—'}
                    </td>
                    <td className="py-2.5 pr-3 font-medium">
                      {r.body_movement !== null ? `${r.body_movement}%` : '—'}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs">
                      {r.distance_cm !== null ? `${r.distance_cm}` : '—'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={r.bed_status === 'in_bed' ? 'default' : 'secondary'} className="text-[10px] py-0">
                        {r.bed_status === 'in_bed' ? '在床' : '离床'}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {getSleepText(r.sleep_status)}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                      {r.ambient_temperature ?? '—'}°C / {r.humidity ?? '—'}%
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-rose-500 text-xs">
                      {r.body_surface_temperature ? `${r.body_surface_temperature}°C` : '—'}
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
