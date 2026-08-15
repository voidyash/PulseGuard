import { useState } from "react";
import { api, type SimulationChange } from "../lib/api";
import { formatPercent } from "../lib/format";
import { parameterMeta } from "../lib/parameters";
import type { PatientDetail, RiskAssessment, RiskModel } from "../lib/types";
import { AlertBadge } from "./AlertBadge";

const EDITABLE = ["heart_rate", "spo2", "temperature", "systolic_bp", "diastolic_bp"] as const;

interface SimulationPanelProps {
  patient: PatientDetail;
  current: RiskAssessment;
  model: RiskModel;
  onSimulated: (assessment: RiskAssessment | null) => void;
}

export function SimulationPanel({ patient, current, model, onSimulated }: SimulationPanelProps) {
  const latest = patient.measurements[patient.measurements.length - 1];

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const key of EDITABLE) {
      const value = latest[key] as number | null;
      initial[key] = value === null ? "" : String(value);
    }
    return initial;
  });

  const [missing, setMissing] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const key of EDITABLE) {
      initial[key] = latest[key] === null;
    }
    return initial;
  });

  const [result, setResult] = useState<RiskAssessment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setResult(null);
    setError(null);
    const nextValues: Record<string, string> = {};
    const nextMissing: Record<string, boolean> = {};
    for (const key of EDITABLE) {
      const value = latest[key] as number | null;
      nextValues[key] = value === null ? "" : String(value);
      nextMissing[key] = value === null;
    }
    setValues(nextValues);
    setMissing(nextMissing);
    onSimulated(null);
  }

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMissing(key: string) {
    setMissing((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function simulate() {
    const changes: SimulationChange[] = [];
    for (const key of EDITABLE) {
      if (missing[key]) {
        changes.push({ index: -1, parameter: key, value: null });
        continue;
      }
      const parsed = Number(values[key]);
      if (values[key] === "" || !Number.isFinite(parsed)) {
        setError(`Enter a numeric value for ${parameterMeta(key).label} or mark it missing.`);
        return;
      }
      changes.push({ index: -1, parameter: key, value: parsed });
    }
    setSubmitting(true);
    setError(null);
    try {
      const assessment = await api.simulate(patient.id, changes, model);
      setResult(assessment);
      onSimulated(assessment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-n-600">
        Adjust the latest reading and reassess risk. The simulation applies to a copy of the
        trajectory and is not saved.
      </p>
      <div className="space-y-2">
        {EDITABLE.map((key) => {
          const meta = parameterMeta(key);
          return (
            <div key={key} className="flex items-center gap-2">
              <label htmlFor={`sim-${key}`} className="w-28 text-xs text-n-600">
                {meta.label}
              </label>
              <input
                id={`sim-${key}`}
                type="number"
                step="any"
                value={values[key]}
                disabled={missing[key]}
                onChange={(event) => setValue(key, event.target.value)}
                className="w-24 rounded-md border border-n-100 bg-n-0 px-2 py-1 font-mono text-sm text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:bg-n-50"
              />
              <span className="font-mono text-xs text-n-400">{meta.unit}</span>
              <label className="ml-auto flex cursor-pointer items-center gap-1 text-xs text-n-600">
                <input
                  type="checkbox"
                  checked={missing[key]}
                  onChange={() => toggleMissing(key)}
                  className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                />
                missing
              </label>
            </div>
          );
        })}
      </div>
      {error ? <p className="text-xs text-critical">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={simulate}
          disabled={submitting}
          className="rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-info focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          {submitting ? "Simulating…" : "Simulate changes"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-n-100 px-3 py-1.5 text-sm text-n-600 transition-colors duration-150 hover:bg-n-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Reset
        </button>
      </div>
      {result ? (
        <div className="space-y-3 rounded-md border border-n-100 bg-n-25 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-n-600">Current risk</div>
              <div className="font-mono text-base font-medium text-n-950">
                {formatPercent(current.risk)}
              </div>
            </div>
            <div>
              <div className="text-xs text-n-600">Simulated risk</div>
              <div className="font-mono text-base font-medium text-n-950">{formatPercent(result.risk)}</div>
            </div>
            <div>
              <div className="text-xs text-n-600">Current confidence</div>
              <div className="font-mono text-sm text-n-950">{formatPercent(current.confidence)}</div>
            </div>
            <div>
              <div className="text-xs text-n-600">Simulated confidence</div>
              <div className="font-mono text-sm text-n-950">{formatPercent(result.confidence)}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-n-600">Simulated alert:</span>
            <AlertBadge level={result.alert_level} />
          </div>
          {result.alert_suppressed ? (
            <p className="text-xs text-n-600">{result.suppression_reason}</p>
          ) : null}
          {result.top_factors.length > 0 ? (
            <div className="space-y-1">
              {result.top_factors.map((factor) => (
                <p key={factor.parameter} className="text-xs text-n-800">
                  <span className="font-medium">{factor.parameter}</span> - {factor.summary}
                </p>
              ))}
            </div>
          ) : null}
          {result.data_quality.important_missing_parameters.length > 0 ? (
            <p className="text-xs text-n-600">
              Missing from latest reading:{" "}
              <span className="font-mono">
                {result.data_quality.important_missing_parameters.join(", ")}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
