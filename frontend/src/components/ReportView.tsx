import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, formatNumber, formatPercent, formatTime } from "../lib/format";
import { parameterMeta } from "../lib/parameters";
import type {
  Anomaly,
  ModelInfo,
  PatientDetail,
  PatientTimeline,
  RecommendationsResponse,
  RiskAssessment,
  RiskTimelinePoint,
  TimeSeriesPoint,
} from "../lib/types";

interface ReportViewProps {
  patient: PatientDetail;
  risk: RiskAssessment;
  timeline: PatientTimeline;
  anomalies: Anomaly[];
  recommendations: RecommendationsResponse;
  models: ModelInfo[] | null;
}

const PRIORITY_STYLE: Record<string, string> = {
  high: "text-critical",
  medium: "text-warning",
  low: "text-n-600",
};

function ReportRiskChart({ points }: { points: RiskTimelinePoint[] }) {
  const data = points.map((point) => ({ ...point, label: formatTime(point.timestamp) }));
  return (
    <LineChart width={680} height={175} data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
      <CartesianGrid stroke="var(--color-n-100)" strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 10, fill: "var(--color-n-600)" }}
        tickLine={false}
        axisLine={false}
        minTickGap={24}
      />
      <YAxis
        width={40}
        domain={[0, 1]}
        tick={{ fontSize: 10, fill: "var(--color-n-600)" }}
        tickLine={false}
        axisLine={false}
        tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
      />
      <Tooltip
        contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid var(--color-n-100)" }}
        formatter={(value: unknown, name: unknown) => [
          typeof value === "number" ? `${Math.round(value * 100)}%` : "-",
          name === "risk" ? "Risk" : "Confidence",
        ]}
      />
      <ReferenceLine y={0.7} stroke="var(--color-critical)" strokeDasharray="4 4" strokeOpacity={0.5} />
      <ReferenceLine y={0.45} stroke="var(--color-warning)" strokeDasharray="4 4" strokeOpacity={0.5} />
      <Line type="monotone" dataKey="risk" name="risk" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 2.5, fill: "var(--color-accent)" }} />
      <Line
        type="monotone"
        dataKey="confidence"
        name="confidence"
        stroke="var(--color-n-400)"
        strokeWidth={1}
        strokeDasharray="3 3"
        dot={false}
      />
    </LineChart>
  );
}

function ReportTrendChart({
  title,
  unit,
  baseline,
  points,
}: {
  title: string;
  unit: string;
  baseline: number;
  points: TimeSeriesPoint[];
}) {
  const data = points.map((point) => ({ ...point, label: formatTime(point.timestamp) }));
  return (
    <figure className="break-inside-avoid">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-n-950">{title}</span>
        <span className="font-mono text-[10px] text-n-600">
          baseline {baseline}
          {unit}
        </span>
      </figcaption>
      <LineChart width={330} height={115} data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-n-100)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--color-n-600)" }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis
          width={34}
          domain={["auto", "auto"]}
          tick={{ fontSize: 9, fill: "var(--color-n-600)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => `${value}${unit}`}
        />
        <ReferenceLine y={baseline} stroke="var(--color-n-400)" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="value" name="value" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 2, fill: "var(--color-accent)" }} connectNulls={false} />
        <Line type="monotone" dataKey="rolling_mean" name="rolling mean" stroke="var(--color-n-400)" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls={false} />
      </LineChart>
    </figure>
  );
}

export function ReportView({ patient, risk, timeline, anomalies, recommendations, models }: ReportViewProps) {
  const generated = formatDate(new Date().toISOString());
  const trainedModels = (models ?? []).filter((model) => model.status === "trained");
  return (
    <div className="print-report hidden print:block">
      {/* Page 1 - graphs */}
      <section className="print-page">
        <header>
          <h1 className="text-xl font-semibold text-n-950">PulseGuard - patient risk report</h1>
          <p className="mt-1 text-sm text-n-950">
            {patient.display_name} <span className="font-mono text-n-600">#{patient.id}</span> · {patient.age}{" "}
            years · {patient.sex} · {patient.medical_history.join(", ")}
          </p>
          <p className="mt-0.5 text-xs text-n-600">Generated {generated} · Synthetic-data prototype for clinical review support only</p>
        </header>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="rounded border border-n-100 px-3 py-1.5">
            <div className="text-[10px] text-n-600">Risk</div>
            <div className="font-mono text-base font-medium text-n-950">{formatPercent(risk.risk)}</div>
          </div>
          <div className="rounded border border-n-100 px-3 py-1.5">
            <div className="text-[10px] text-n-600">Confidence</div>
            <div className="font-mono text-base font-medium text-n-950">{formatPercent(risk.confidence)}</div>
          </div>
          <div className="rounded border border-n-100 px-3 py-1.5">
            <div className="text-[10px] text-n-600">Data quality</div>
            <div className="font-mono text-base font-medium text-n-950">{formatPercent(risk.data_quality.score)}</div>
          </div>
          <div className="rounded border border-n-100 px-3 py-1.5">
            <div className="text-[10px] text-n-600">Alert level</div>
            <div className="font-mono text-base font-medium text-n-950">{risk.alert_level}</div>
          </div>
        </div>

        <h2 className="mt-3 text-sm font-semibold text-n-950">Risk timeline</h2>
        <div className="mt-1 break-inside-avoid rounded border border-n-100 p-2">
          <ReportRiskChart points={timeline.risk_points} />
        </div>

        <h2 className="mt-3 text-sm font-semibold text-n-950">Time-series trends</h2>
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2">
          {timeline.series.map((series) => {
            const meta = parameterMeta(series.parameter);
            return (
              <ReportTrendChart
                key={series.parameter}
                title={meta.label}
                unit={meta.unit}
                baseline={series.baseline}
                points={series.points}
              />
            );
          })}
        </div>
      </section>

      {/* Page 2 - detailed writing */}
      <section className="print-page print-page-break">
        <h1 className="text-lg font-semibold text-n-950">Assessment details</h1>

        <h2 className="mt-4 text-sm font-semibold text-n-950">Why this patient was flagged</h2>
        {risk.top_factors.length === 0 ? (
          <p className="mt-1 text-sm text-n-600">No contributing factors.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {risk.top_factors.map((factor) => (
              <li key={factor.parameter} className="flex gap-3">
                <span className="w-32 shrink-0 font-mono text-xs text-n-600">
                  {Math.round(factor.contribution * 100)}%
                </span>
                <div>
                  <p className="text-sm font-medium text-n-950">{factor.parameter}</p>
                  <p className="text-xs text-n-600">{factor.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {risk.alert_suppressed ? (
          <p className="mt-2 text-xs text-n-600">Alert suppressed: {risk.suppression_reason}</p>
        ) : null}
        {risk.data_quality.important_missing_parameters.length > 0 ? (
          <p className="mt-2 text-xs text-n-600">
            Confidence is reduced while the latest reading is incomplete; missing:{" "}
            {risk.data_quality.important_missing_parameters.join(", ")}.
          </p>
        ) : null}

        <h2 className="mt-4 text-sm font-semibold text-n-950">Anomalies</h2>
        {anomalies.length === 0 ? (
          <p className="mt-1 text-sm text-n-600">No notable deviations from this patient's baseline.</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-n-100 text-xs text-n-600">
                <th className="py-1 pr-3 font-medium">Time</th>
                <th className="py-1 pr-3 font-medium">Parameter</th>
                <th className="py-1 pr-3 font-medium">Value</th>
                <th className="py-1 pr-3 font-medium">Baseline</th>
                <th className="py-1 font-medium">Transient</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((anomaly) => (
                <tr key={`${anomaly.timestamp}-${anomaly.parameter}`} className="border-b border-n-50 last:border-b-0">
                  <td className="py-1 pr-3 font-mono text-xs text-n-600">{formatTime(anomaly.timestamp)}</td>
                  <td className="py-1 pr-3 text-n-950">{parameterMeta(anomaly.parameter).label}</td>
                  <td className="py-1 pr-3 font-mono text-n-950">{formatNumber(anomaly.value)}</td>
                  <td className="py-1 pr-3 font-mono text-n-600">{formatNumber(anomaly.baseline)}</td>
                  <td className="py-1 font-mono text-n-600">{anomaly.is_transient ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2 className="mt-4 text-sm font-semibold text-n-950">Recommendations for review</h2>
        {recommendations.recommendations.length === 0 ? (
          <p className="mt-1 text-sm text-n-600">No recommendations at this time.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {recommendations.recommendations.map((rec, index) => (
              <li key={`${rec.category}-${index}`} className="flex gap-3">
                <span className={`mt-0.5 w-14 shrink-0 font-mono text-xs uppercase ${PRIORITY_STYLE[rec.priority] ?? "text-n-600"}`}>
                  {rec.priority}
                </span>
                <div>
                  <p className="text-sm text-n-950">{rec.text}</p>
                  <p className="text-xs text-n-600">{rec.rationale}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {trainedModels.length > 0 ? (
          <>
            <h2 className="mt-4 text-sm font-semibold text-n-950">Models used</h2>
            <p className="mt-1 text-xs text-n-600">
              {trainedModels.map((model) => model.name).join(", ")} - trained in memory on generated
              synthetic trajectories.
            </p>
          </>
        ) : null}

        <p className="mt-6 text-xs text-n-400">{risk.prototype_notice}</p>
      </section>
    </div>
  );
}
