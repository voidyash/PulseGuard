import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertBadge } from "../components/AlertBadge";
import { Metric } from "../components/Metric";
import { ModelsPanel } from "../components/ModelsPanel";
import { Panel } from "../components/Panel";
import { ReportView } from "../components/ReportView";
import { RiskChart } from "../components/RiskChart";
import { SimulationPanel } from "../components/SimulationPanel";
import { TrendChart } from "../components/TrendChart";
import { api } from "../lib/api";
import { formatNumber, formatPercent, formatTime } from "../lib/format";
import { parameterMeta } from "../lib/parameters";
import type {
  Anomaly,
  ModelInfo,
  PatientDetail as PatientDetailType,
  PatientTimeline,
  RecommendationsResponse,
  RiskAssessment,
  RiskModel,
} from "../lib/types";

interface DetailState {
  patient: PatientDetailType;
  risk: RiskAssessment;
  timeline: PatientTimeline;
  anomalies: Anomaly[];
  recommendations: RecommendationsResponse;
}

const PRIORITY_STYLE: Record<string, string> = {
  high: "text-critical",
  medium: "text-warning",
  low: "text-n-600",
};

const MODEL_OPTIONS: { value: RiskModel; label: string }[] = [
  { value: "hybrid", label: "Hybrid (XGBoost + rules)" },
  { value: "xgboost", label: "XGBoost" },
  { value: "logistic", label: "Logistic Regression" },
];

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<DetailState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulated, setSimulated] = useState<RiskAssessment | null>(null);
  const [model, setModel] = useState<RiskModel>("hybrid");
  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const modelRef = useRef<RiskModel>("hybrid");

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    setState(null);
    try {
      const [patient, risk, timeline, anomalies, recommendations] = await Promise.all([
        api.getPatient(id),
        api.getRisk(id, modelRef.current),
        api.getTimeline(id),
        api.getAnomalies(id),
        api.getRecommendations(id),
      ]);
      setState({ patient, risk, timeline, anomalies, recommendations });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient.");
    }
  }, [id]);

  const loadRisk = useCallback(
    async (selected: RiskModel) => {
      if (!id) return;
      setRiskLoading(true);
      try {
        const risk = await api.getRisk(id, selected);
        setState((prev) => (prev ? { ...prev, risk } : prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reassess risk.");
      } finally {
        setRiskLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    api
      .getModels()
      .then((result) => {
        if (!cancelled) setModels(result);
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The initial load already fetches risk with the default model; this effect
  // reassesses only when the clinician switches the risk model.
  useEffect(() => {
    if (!state) return;
    setSimulated(null);
    void loadRisk(model);
  }, [model]);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm text-critical">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-md border border-n-100 px-3 py-1.5 text-sm text-n-600 transition-colors duration-150 hover:bg-n-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Retry
        </button>
      </div>
    );
  }

  if (state === null) {
    return <p className="mx-auto max-w-6xl px-6 py-10 text-sm text-n-600">Loading patient…</p>;
  }

  const { patient, risk, timeline, anomalies, recommendations } = state;
  const display = simulated ?? risk;

  return (
    <>
      <div className="mx-auto max-w-6xl px-6 py-8 print:hidden">
        <Link to="/patients" className="text-sm text-accent underline-offset-2 hover:underline">
          ← All patients
        </Link>

        <header className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-n-950">{patient.display_name}</h1>
            <p className="mt-1 text-sm text-n-600">
              <span className="font-mono">#{patient.id}</span> · {patient.age} years · {patient.sex} ·{" "}
              {patient.medical_history.join(", ")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AlertBadge level={display.alert_level} />
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-n-100 px-3 py-1.5 text-sm text-n-600 transition-colors duration-150 hover:bg-n-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Download PDF report
            </button>
          </div>
        </header>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Risk" value={formatPercent(display.risk)} />
            <Metric label="Confidence" value={formatPercent(display.confidence)} />
            <Metric
              label="Data quality"
              value={formatPercent(display.data_quality.score)}
              sub={
                display.data_quality.important_missing_parameters.length > 0
                  ? `Missing: ${display.data_quality.important_missing_parameters.join(", ")}`
                  : "Complete"
              }
            />
            <Metric
              label="Alert level"
              value={display.alert_level}
              sub={simulated ? "simulated" : "current"}
            />
          </div>
          <label className="flex flex-col items-end gap-1 text-xs text-n-600">
            Risk model
            <select
              value={model}
              onChange={(event) => setModel(event.target.value as RiskModel)}
              className="rounded-md border border-n-100 bg-n-0 px-2 py-1.5 text-sm text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {riskLoading ? <p className="mt-2 text-xs text-n-600">Reassessing risk…</p> : null}
        {display.alert_suppressed ? (
          <p className="mt-2 text-sm text-n-600">Alert suppressed: {display.suppression_reason}</p>
        ) : null}
        {display.data_quality.important_missing_parameters.length > 0 ? (
          <p className="mt-2 text-xs text-n-600">
            Confidence is reduced while the latest reading is incomplete.
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-6 lg:col-span-8">
            <Panel title="Risk timeline">
              <RiskChart points={timeline.risk_points} />
              <p className="mt-3 text-xs text-n-600">
                Prototype risk and confidence at each measurement, against the warning and critical
                thresholds.
              </p>
            </Panel>

            <Panel title="Time-series trends">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {timeline.series.map((series) => {
                  const meta = parameterMeta(series.parameter);
                  return (
                    <TrendChart
                      key={series.parameter}
                      title={meta.label}
                      unit={meta.unit}
                      baseline={series.baseline}
                      points={series.points}
                    />
                  );
                })}
              </div>
            </Panel>

            <Panel title="Recommendations">
              {recommendations.recommendations.length === 0 ? (
                <p className="text-sm text-n-600">No recommendations at this time.</p>
              ) : (
                <ol className="space-y-3">
                  {recommendations.recommendations.map((rec, index) => (
                    <li key={`${rec.category}-${index}`} className="flex gap-3">
                      <span
                        className={`mt-0.5 shrink-0 font-mono text-xs uppercase ${PRIORITY_STYLE[rec.priority] ?? "text-n-600"}`}
                      >
                        {rec.priority}
                      </span>
                      <div>
                        <p className="text-sm text-n-950">{rec.text}</p>
                        <p className="mt-0.5 text-xs text-n-600">{rec.rationale}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>

          <div className="col-span-12 space-y-6 lg:col-span-4">
            <Panel title="Why this patient was flagged">
              {display.top_factors.length === 0 ? (
                <p className="text-sm text-n-600">No contributing factors.</p>
              ) : (
                <ul className="space-y-3">
                  {display.top_factors.map((factor) => (
                    <li key={factor.parameter}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-n-950">{factor.parameter}</span>
                        <span className="font-mono text-xs text-n-600">
                          {Math.round(factor.contribution * 100)}%
                        </span>
                      </div>
                      <div aria-hidden="true" className="mt-1 h-1 w-full rounded-full bg-n-50">
                        <div
                          className="h-1 rounded-full bg-accent"
                          style={{ width: `${Math.max(2, factor.contribution * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-n-600">{factor.summary}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Models in use">
              <ModelsPanel />
            </Panel>

            <Panel title="Anomalies">
              {anomalies.length === 0 ? (
                <p className="text-sm text-n-600">No notable deviations from this patient's baseline.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-n-100 text-xs text-n-600">
                        <th scope="col" className="py-1.5 pr-3 font-medium">
                          Parameter
                        </th>
                        <th scope="col" className="py-1.5 pr-3 font-medium">
                          Value
                        </th>
                        <th scope="col" className="py-1.5 pr-3 font-medium">
                          Baseline
                        </th>
                        <th scope="col" className="py-1.5 font-medium">
                          Transient
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalies.map((anomaly) => (
                        <tr key={`${anomaly.timestamp}-${anomaly.parameter}`} className="border-b border-n-50 last:border-b-0">
                          <td className="py-1.5 pr-3 text-n-950">
                            {parameterMeta(anomaly.parameter).label}
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-n-950">{formatNumber(anomaly.value)}</td>
                          <td className="py-1.5 pr-3 font-mono text-n-600">{formatNumber(anomaly.baseline)}</td>
                          <td className="py-1.5 font-mono text-n-600">{anomaly.is_transient ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-n-600">
                    Latest anomaly: {anomalies.length > 0 ? formatTime(anomalies[anomalies.length - 1].timestamp) : "-"}
                  </p>
                </div>
              )}
            </Panel>

            <Panel title="What-if simulation">
              <SimulationPanel patient={patient} current={risk} model={model} onSimulated={setSimulated} />
            </Panel>
          </div>
        </div>

        <p className="mt-8 text-xs text-n-400">{display.prototype_notice}</p>
      </div>

      <ReportView
        patient={patient}
        risk={display}
        timeline={timeline}
        anomalies={anomalies}
        recommendations={recommendations}
        models={models}
      />
    </>
  );
}
