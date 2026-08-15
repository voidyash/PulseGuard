import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AddPatientModal } from "../components/AddPatientModal";
import { AlertBadge } from "../components/AlertBadge";
import { api } from "../lib/api";
import { formatPercent } from "../lib/format";
import type { AlertLevel, PatientDetail, PatientSummary } from "../lib/types";

const LEVELS: { level: AlertLevel; title: string }[] = [
  { level: "critical", title: "Critical patients" },
  { level: "warning", title: "Warning patients" },
  { level: "watch", title: "Watch patients" },
  { level: "stable", title: "Stable patients" },
];

export function Dashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<AlertLevel | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setPatients(null);
    try {
      setPatients(await api.listPatients());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  if (patients === null) {
    return <p className="mx-auto max-w-6xl px-6 py-10 text-sm text-n-600">Loading patients…</p>;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visible = patients.filter((patient) => {
    const matchesLevel = level === "all" || patient.alert_level === level;
    const matchesQuery =
      normalizedQuery === "" ||
      patient.id.toLowerCase().includes(normalizedQuery) ||
      patient.display_name.toLowerCase().includes(normalizedQuery);
    return matchesLevel && matchesQuery;
  });
  const activeLevels = level === "all" ? LEVELS : LEVELS.filter((item) => item.level === level);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-n-950">Patient panel</h1>
          <p className="mt-1 text-sm text-n-600">
            Prioritized by current prototype risk. Risk and confidence are shown separately.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-info focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Add patient
        </button>
      </header>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="w-full max-w-sm">
          <label htmlFor="patient-search" className="block text-sm text-n-800">
            Search patients
          </label>
          <input
            id="patient-search"
            type="search"
            placeholder="Patient ID or name…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-1 w-full rounded-md border border-n-100 bg-n-0 px-3 py-2 text-sm text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>
        <div>
          <label htmlFor="level-filter" className="block text-sm text-n-800">
            Alert level
          </label>
          <select
            id="level-filter"
            value={level}
            onChange={(event) => setLevel(event.target.value as AlertLevel | "all")}
            className="mt-1 w-full rounded-md border border-n-100 bg-n-0 px-3 py-2 text-sm text-n-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <option value="all">All levels</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="watch">Watch</option>
            <option value="stable">Stable</option>
          </select>
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-n-600">No patients match the current filters.</p>
      ) : (
        <div className="mt-6 space-y-8">
        {activeLevels.map(({ level, title }) => {
          const rows = visible
            .filter((patient) => patient.alert_level === level)
            .sort((a, b) => b.risk - a.risk || a.id.localeCompare(b.id));
          return (
            <section key={level} aria-labelledby={`heading-${level}`}>
              <h2 id={`heading-${level}`} className="text-sm font-semibold text-n-950">
                {title}
                <span className="ml-2 font-mono text-xs font-normal text-n-400">{rows.length}</span>
              </h2>
              {rows.length === 0 ? (
                <p className="mt-2 text-sm text-n-600">No patients in this group.</p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-md border border-n-100 bg-n-0">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-n-100 text-xs text-n-600">
                        <th scope="col" className="px-4 py-2 font-medium">
                          Patient
                        </th>
                        <th scope="col" className="px-4 py-2 font-medium">
                          Age
                        </th>
                        <th scope="col" className="px-4 py-2 font-medium">
                          Risk
                        </th>
                        <th scope="col" className="px-4 py-2 font-medium">
                          Confidence
                        </th>
                        <th scope="col" className="px-4 py-2 font-medium">
                          Data quality
                        </th>
                        <th scope="col" className="px-4 py-2 font-medium">
                          Alert
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((patient) => {
                        const open = () => navigate(`/patients/${patient.id}`);
                        const onKeyDown = (event: KeyboardEvent) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            open();
                          }
                        };
                        return (
                          <tr
                            key={patient.id}
                            tabIndex={0}
                            role="link"
                            aria-label={`Open patient ${patient.display_name}`}
                            onClick={open}
                            onKeyDown={onKeyDown}
                            className="cursor-pointer border-b border-n-50 last:border-b-0 transition-colors duration-150 hover:bg-n-25 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                          >
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-n-600">#{patient.id}</span>{" "}
                              <span className="text-n-950">{patient.display_name}</span>
                            </td>
                            <td className="px-4 py-2.5 text-n-600">{patient.age}</td>
                            <td className="px-4 py-2.5 font-mono text-n-950">
                              {formatPercent(patient.risk)}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-n-600">
                              {formatPercent(patient.confidence)}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-n-600">
                              {formatPercent(patient.data_quality)}
                            </td>
                            <td className="px-4 py-2.5">
                              <AlertBadge level={patient.alert_level} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
        </div>
      )}
      <p className="mt-8 text-xs text-n-400">
        <Link to="/patients" className="underline hover:text-n-600">
          Refresh
        </Link>{" "}
        · Synthetic data only · Not a diagnosis or treatment recommendation
      </p>

      {adding ? (
        <AddPatientModal
          onClose={() => setAdding(false)}
          onCreated={(patient: PatientDetail) => navigate(`/patients/${patient.id}`)}
        />
      ) : null}
    </div>
  );
}
