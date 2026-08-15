import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { parameterMeta } from "../lib/parameters";
import type { PatientDetail, VitalMeasurement } from "../lib/types";

interface AddPatientModalProps {
  onClose: () => void;
  onCreated: (patient: PatientDetail) => void;
}

const READINGS = ["heart_rate", "spo2", "temperature", "systolic_bp", "diastolic_bp"] as const;

export function AddPatientModal({ onClose, onCreated }: AddPatientModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("Female");
  const [history, setHistory] = useState("");
  const [readings, setReadings] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setReading(key: string, value: string) {
    setReadings((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsedAge = Number(age);
    if (age.trim() === "" || !Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 130) {
      setError("Enter a valid age between 0 and 130.");
      return;
    }
    if (sex.trim() === "") {
      setError("Enter the patient's sex.");
      return;
    }
    for (const key of READINGS) {
      const raw = readings[key];
      if (raw !== undefined && raw.trim() !== "") {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
          setError(`Enter a numeric value for ${parameterMeta(key).label} or leave it blank.`);
          return;
        }
      }
    }

    const historyItems = history
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const providedReadings = READINGS.filter((key) => readings[key]?.trim() !== "");
    const measurements: VitalMeasurement[] | undefined =
      providedReadings.length > 0
        ? [
            {
              timestamp: new Date().toISOString(),
              heart_rate: readings.heart_rate?.trim() !== "" ? Number(readings.heart_rate) : null,
              spo2: readings.spo2?.trim() !== "" ? Number(readings.spo2) : null,
              temperature: readings.temperature?.trim() !== "" ? Number(readings.temperature) : null,
              systolic_bp: readings.systolic_bp?.trim() !== "" ? Number(readings.systolic_bp) : null,
              diastolic_bp: readings.diastolic_bp?.trim() !== "" ? Number(readings.diastolic_bp) : null,
              glucose: null,
              sleep_hours: null,
              activity_level: null,
            },
          ]
        : undefined;

    setSubmitting(true);
    setError(null);
    try {
      const patient = await api.addPatient({
        display_name: displayName.trim() || undefined,
        age: parsedAge,
        sex: sex.trim(),
        medical_history: historyItems.length > 0 ? historyItems : undefined,
        measurements,
      });
      onCreated(patient);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add the patient.");
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-patient-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-n-950/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={(event) => void submit(event)}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-n-100 bg-n-0 p-5"
      >
        <h2 id="add-patient-title" className="text-lg font-semibold text-n-950">
          Add a patient
        </h2>
        <p className="mt-1 text-xs text-n-600">
          The patient is added to the in-memory prototype store and given a risk assessment
          immediately.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 block text-sm text-n-800">
            Display name <span className="text-n-400">(optional)</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="e.g. Patient #9001"
              className="mt-1 w-full rounded-md border border-n-100 bg-n-0 px-3 py-2 text-sm text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="block text-sm text-n-800">
            Age
            <input
              type="number"
              min={0}
              max={130}
              value={age}
              onChange={(event) => setAge(event.target.value)}
              className="mt-1 w-full rounded-md border border-n-100 bg-n-0 px-3 py-2 text-sm text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="block text-sm text-n-800">
            Sex
            <select
              value={sex}
              onChange={(event) => setSex(event.target.value)}
              className="mt-1 w-full rounded-md border border-n-100 bg-n-0 px-3 py-2 text-sm text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </label>
          <label className="col-span-2 block text-sm text-n-800">
            Medical history <span className="text-n-400">(optional, comma-separated)</span>
            <input
              type="text"
              value={history}
              onChange={(event) => setHistory(event.target.value)}
              placeholder="e.g. Hypertension, Type 2 diabetes"
              className="mt-1 w-full rounded-md border border-n-100 bg-n-0 px-3 py-2 text-sm text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm text-n-800">
            Latest reading <span className="text-n-400">(optional - leave blank for default baseline)</span>
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {READINGS.map((key) => {
              const meta = parameterMeta(key);
              return (
                <label key={key} className="block text-xs text-n-600">
                  {meta.label}
                  <input
                    type="number"
                    step="any"
                    value={readings[key] ?? ""}
                    onChange={(event) => setReading(key, event.target.value)}
                    className="mt-1 w-full rounded-md border border-n-100 bg-n-0 px-2 py-1.5 font-mono text-sm text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  />
                </label>
              );
            })}
          </div>
        </fieldset>

        {error ? <p className="mt-3 text-sm text-critical">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-n-100 px-3 py-1.5 text-sm text-n-600 transition-colors duration-150 hover:bg-n-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-info focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add patient"}
          </button>
        </div>
      </form>
    </div>
  );
}
