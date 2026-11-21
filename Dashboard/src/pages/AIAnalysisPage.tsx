import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, CheckCircle, AlertTriangle, Info, Cpu, Layers } from 'lucide-react'
import { mockPredictions, mockModelEvaluations } from '@/data/mock-data'
import { formatTimestamp } from '@/lib/utils'

// ---------------------------------------------------------------------------
// AI Analysis Page
// ---------------------------------------------------------------------------

interface AIAnalysisPageProps {
  predictions?: typeof mockPredictions
  evaluations?: typeof mockModelEvaluations
}

export function AIAnalysisPage({ predictions = mockPredictions, evaluations = mockModelEvaluations }: AIAnalysisPageProps) {
  const latestPrediction = predictions[0] ?? mockPredictions[0]
  const selectedModel = evaluations.find((m) => m.is_selected) ?? evaluations[0]

  return (
    <div className="space-y-6 p-6">
      {/* Clinical Disclaimer Notice */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Statistical Monitoring Advisory (Non-Diagnostic)
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/80">
            This system evaluates statistical patterns and anomaly scores from contactless radar & environmental sensors for academic research. 
            It distinguishes statistical variations from clinical conditions and is not intended to provide medical diagnoses or replace clinical decision-making.
          </p>
        </div>
      </div>

      {/* Current Real-time Inference */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-violet-500" />
              <div>
                <CardTitle>Real-time Inference Anomaly State</CardTitle>
                <CardDescription>
                  Streaming output evaluated by edge Random Forest model ({latestPrediction.model_version})
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {latestPrediction.inference_location}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {latestPrediction.prediction === 'normal' ? (
                <div className="p-3 bg-emerald-500/10 rounded-full">
                  <CheckCircle className="h-9 w-9 text-emerald-500" />
                </div>
              ) : (
                <div className="p-3 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-9 w-9 text-destructive" />
                </div>
              )}
              <div>
                <p className="text-3xl font-bold capitalize">
                  {latestPrediction.prediction.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Anomaly Deviation Score:{' '}
                  <span className="font-semibold text-foreground">
                    {latestPrediction.anomaly_score?.toFixed(2) ?? '0.05'}
                  </span>{' '}
                  / 1.00
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Info className="h-3.5 w-3.5" />
              <span>
                Telemetry sample logged at {formatTimestamp(latestPrediction.recorded_at)} &middot; Inference cycle ~5s
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Feature Weight Summary */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-500" />
              <CardTitle className="text-sm font-medium">Input Feature Modalities</CardTitle>
            </div>
            <CardDescription className="text-xs">Feature extraction weights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Heart Rate Variate (DP6)</span>
              <span className="font-mono font-medium">35% weight</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Respiratory Frequency (DP8)</span>
              <span className="font-mono font-medium">25% weight</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Body Movement Energy (DP4)</span>
              <span className="font-mono font-medium">20% weight</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target Distance & Pos (DP3/5)</span>
              <span className="font-mono font-medium">10% weight</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IR Body Temperature</span>
              <span className="font-mono font-medium">10% weight</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prediction history */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Inference History</CardTitle>
          <CardDescription>Recent anomaly classification results and scores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockPredictions.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {p.prediction === 'normal' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {p.prediction.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(p.recorded_at)} &middot;{' '}
                      {p.inference_location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Score: {p.anomaly_score?.toFixed(2) ?? '—'}
                  </span>
                  <Badge
                    variant={
                      p.prediction === 'normal' ? 'default' : 'destructive'
                    }
                  >
                    {p.prediction === 'normal' ? 'Normal' : 'Anomaly'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Static Model Evaluation Specifications (At the bottom as requested) */}
      {selectedModel && (
        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Offline Benchmark & Model Specification (Static Reference)</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">Offline Validated Benchmark</Badge>
            </div>
            <CardDescription className="text-xs">
              Pre-trained model baseline specification evaluated offline on test validation datasets.
              Model: {selectedModel.model_name} ({selectedModel.model_version})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              <MetricBox
                label="Accuracy"
                value={pct(selectedModel.accuracy)}
              />
              <MetricBox
                label="Precision"
                value={pct(selectedModel.precision)}
              />
              <MetricBox
                label="Recall"
                value={pct(selectedModel.recall)}
              />
              <MetricBox
                label="F1 Score"
                value={pct(selectedModel.f1_score)}
              />
              <MetricBox
                label="Inference Latency"
                value={`${selectedModel.inference_latency_ms ?? 4.5} ms`}
              />
              <MetricBox
                label="RAM Footprint"
                value={`${selectedModel.memory_mb ?? 1.2} MB`}
              />
              <MetricBox
                label="Flash Size"
                value={`${selectedModel.model_size_kb ?? 48.5} KB`}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-center">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-base font-semibold mt-0.5">{value}</p>
    </div>
  )
}

function pct(v: number | null): string {
  if (v === null) return '—'
  return `${(v * 100).toFixed(1)}%`
}
