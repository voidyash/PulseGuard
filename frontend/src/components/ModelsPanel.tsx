import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ModelInfo } from "../lib/types";

const KIND_LABEL: Record<ModelInfo["kind"], string> = {
  risk: "Risk",
  anomaly: "Anomaly",
  explainability: "Explainability",
};

export function ModelsPanel() {
  const [models, setModels] = useState<ModelInfo[] | null>(null);

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

  if (models === null) {
    return <p className="text-sm text-n-600">Loading models…</p>;
  }

  return (
    <ul className="space-y-3">
      {models.map((model) => (
        <li key={model.name} className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-n-950">{model.name}</span>
              <span className="rounded bg-n-25 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-n-600">
                {KIND_LABEL[model.kind]}
              </span>
              {model.active ? (
                <span className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">
                  primary
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-n-600">{model.description}</p>
          </div>
          <span
            className={`shrink-0 font-mono text-xs ${model.status === "trained" ? "text-stable" : "text-warning"}`}
          >
            {model.status}
          </span>
        </li>
      ))}
      <li className="border-t border-n-50 pt-2 text-xs text-n-400">
        {models.some((model) => model.status === "trained")
          ? "Trained in memory on generated synthetic trajectories; prototype-only and not clinically validated."
          : "ML stack unavailable - the deterministic risk engine is being used."}
      </li>
    </ul>
  );
}
