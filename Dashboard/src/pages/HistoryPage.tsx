import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { generateMockReadings } from '@/data/mock-data'
import type { TimeRange } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RangeConfig {
  count: number
  intervalMinutes: number
  label: string
}

const RANGE_MAP: Record<Exclude<TimeRange, 'custom'>, RangeConfig> = {
  '15m': { count: 15, intervalMinutes: 1, label: 'Last 15 minutes' },
  '1h': { count: 60, intervalMinutes: 1, label: 'Last 1 hour' },
  '24h': { count: 288, intervalMinutes: 5, label: 'Last 24 hours' },
}

function computeStats(values: (number | null)[]): {
  min: number
  max: number
  avg: number
} {
  const valid = values.filter((v): v is number => v !== null)
  if (valid.length === 0) return { min: 0, max: 0, avg: 0 }
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length
  return {
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    avg: Math.round(avg * 10) / 10,
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Stats mini cards
// ---------------------------------------------------------------------------

function StatsMiniCards({
  stats,
  unit,
}: {
  stats: { min: number; max: number; avg: number }
  unit: string
}) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-3">
      {(['min', 'max', 'avg'] as const).map((key) => (
        <div
          key={key}
          className="rounded-lg border bg-muted/40 px-3 py-2 text-center"
        >
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {key}
          </p>
          <p className="text-lg font-semibold">
            {stats[key]}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {unit}
            </span>
          </p>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart card
// ---------------------------------------------------------------------------

interface ChartCardProps {
  title: string
  dataKey: keyof Pick<
    import('@/types').SensorReading,
    'heart_rate' | 'respiratory_rate' | 'ambient_temperature' | 'humidity' | 'body_surface_temperature' | 'body_movement' | 'distance_cm'
  >
  data: import('@/types').SensorReading[]
  color: string
  unit: string
  domainMin?: number
  domainMax?: number
}

function ChartCard({
  title,
  dataKey,
  data,
  color,
  unit,
  domainMin,
  domainMax,
}: ChartCardProps) {
  const chartData = data.map((r) => ({
    time: formatTime(r.recorded_at),
    value: r[dataKey] as number | null,
  }))

  const stats = computeStats(data.map((r) => r[dataKey] as number | null))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                domain={[domainMin ?? 'auto', domainMax ?? 'auto']}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                formatter={(v: any) => [`${v ?? 'N/A'} ${unit}`, title]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <StatsMiniCards stats={stats} unit={unit} />
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// History Page
// ---------------------------------------------------------------------------

interface HistoryPageProps {
  liveReadings?: import('@/types').SensorReading[]
}

export function HistoryPage({ liveReadings }: HistoryPageProps) {
  const [range, setRange] = useState<Exclude<TimeRange, 'custom'>>('15m')

  const readings = useMemo(() => {
    // If live readings from Supabase are provided and non-empty, use them!
    if (liveReadings && liveReadings.length > 0) {
      return liveReadings
    }
    const cfg = RANGE_MAP[range]
    return generateMockReadings(cfg.count, cfg.intervalMinutes)
  }, [range, liveReadings])

  return (
    <div className="space-y-6 p-6">
      <Tabs
        value={range}
        onValueChange={(v) => setRange(v as Exclude<TimeRange, 'custom'>)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {RANGE_MAP[range].label}
          </h3>
          <TabsList>
            <TabsTrigger value="15m">15 min</TabsTrigger>
            <TabsTrigger value="1h">1 hour</TabsTrigger>
            <TabsTrigger value="24h">24 hours</TabsTrigger>
          </TabsList>
        </div>

        {/* All tabs share the same content since data is driven by state */}
        <TabsContent value={range} className="mt-4">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard
              title="Heart Rate"
              dataKey="heart_rate"
              data={readings}
              color="#ef4444"
              unit="bpm"
              domainMin={50}
              domainMax={130}
            />
            <ChartCard
              title="Respiratory Rate"
              dataKey="respiratory_rate"
              data={readings}
              color="#3b82f6"
              unit="brpm"
              domainMin={8}
              domainMax={28}
            />
            <ChartCard
              title="Ambient Temperature"
              dataKey="ambient_temperature"
              data={readings}
              color="#f97316"
              unit="°C"
              domainMin={18}
              domainMax={32}
            />
            <ChartCard
              title="Humidity"
              dataKey="humidity"
              data={readings}
              color="#06b6d4"
              unit="%"
              domainMin={25}
              domainMax={75}
            />
            <ChartCard
              title="Body Surface Temperature (Thermal IR)"
              dataKey="body_surface_temperature"
              data={readings}
              color="#f43f5e"
              unit="°C"
              domainMin={34}
              domainMax={39}
            />
            <ChartCard
              title="Body Movement Intensity (DP4 体动)"
              dataKey="body_movement"
              data={readings}
              color="#f59e0b"
              unit="%"
              domainMin={0}
              domainMax={100}
            />
            <ChartCard
              title="Target Distance (DP3 雷达测距)"
              dataKey="distance_cm"
              data={readings}
              color="#6366f1"
              unit="cm"
              domainMin={50}
              domainMax={300}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
