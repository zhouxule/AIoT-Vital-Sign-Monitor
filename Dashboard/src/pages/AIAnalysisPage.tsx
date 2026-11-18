import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, CheckCircle, AlertTriangle, Info } from 'lucide-react'
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

      {/* Current prediction */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Brain className="h-6 w-6 text-violet-500" />
            <div>
              <CardTitle>Current Prediction</CardTitle>
              <CardDescription>
                Latest model output from{' '}
                <span className="font-medium">{latestPrediction.model_name}</span>{' '}
                ({latestPrediction.model_version})
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {latestPrediction.prediction === 'normal' ? (
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-destructive" />
              )}
              <div>
                <p className="text-2xl font-bold capitalize">
                  {latestPrediction.prediction.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Anomaly Score:{' '}
                  <span className="font-medium">
                    {latestPrediction.anomaly_score?.toFixed(2) ?? '—'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>
                Inference: {latestPrediction.inference_location} &middot;{' '}
                {formatTimestamp(latestPrediction.recorded_at)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Selected model summary */}
        {selectedModel && (
          <Card className="border-primary/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Deployed Model</CardTitle>
                <Badge>Active</Badge>
              </div>
              <CardDescription>
                {selectedModel.model_name} {selectedModel.model_version}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MetricBox
                  label="Accuracy"
                  value={pct(selectedModel.accuracy)}
                />
                <MetricBox
                  label="Precision"
                  value={pct(selectedModel.precision)}
                />
                <MetricBox label="Recall" value={pct(selectedModel.recall)} />
                <MetricBox
                  label="F1 Score"
                  value={pct(selectedModel.f1_score)}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <MetricBox
                  label="Latency"
                  value={`${selectedModel.inference_latency_ms ?? '—'} ms`}
                />
                <MetricBox
                  label="Memory"
                  value={`${selectedModel.memory_mb ?? '—'} MB`}
                />
                <MetricBox
                  label="Model Size"
                  value={`${selectedModel.model_size_kb ?? '—'} KB`}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Anomaly history */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction History</CardTitle>
          <CardDescription>Recent anomaly detection results</CardDescription>
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

      {/* Model comparison table */}
      <Card>
        <CardHeader>
          <CardTitle>Model Comparison</CardTitle>
          <CardDescription>
            Performance metrics for all candidate models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Model</th>
                  <th className="pb-2 pr-4 font-medium">Version</th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    Accuracy
                  </th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    Precision
                  </th>
                  <th className="pb-2 pr-4 font-medium text-right">Recall</th>
                  <th className="pb-2 pr-4 font-medium text-right">F1</th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    Latency (ms)
                  </th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    Size (KB)
                  </th>
                  <th className="pb-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockModelEvaluations.map((m) => (
                  <tr
                    key={m.id}
                    className={`border-b border-border/50 last:border-0 ${
                      m.is_selected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="py-2.5 pr-4 font-medium">{m.model_name}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {m.model_version}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {pct(m.accuracy)}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {pct(m.precision)}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {pct(m.recall)}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {pct(m.f1_score)}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {m.inference_latency_ms ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {m.model_size_kb ?? '—'}
                    </td>
                    <td className="py-2.5 text-center">
                      {m.is_selected ? (
                        <Badge>Deployed</Badge>
                      ) : (
                        <Badge variant="secondary">Candidate</Badge>
                      )}
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2 text-center">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function pct(v: number | null): string {
  if (v === null) return '—'
  return `${(v * 100).toFixed(1)}%`
}
