import type { AlertLevel } from "../lib/types";

const LEVEL_STYLE: Record<AlertLevel, { dot: string; text: string }> = {
  stable: { dot: "bg-stable", text: "text-stable" },
  watch: { dot: "bg-watch", text: "text-watch" },
  warning: { dot: "bg-warning", text: "text-warning" },
  critical: { dot: "bg-critical", text: "text-critical" },
};

export function AlertBadge({ level }: { level: AlertLevel }) {
  const style = LEVEL_STYLE[level];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-n-100 bg-n-0 px-2 py-0.5 font-mono text-xs font-medium capitalize">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${style.dot}`} />
      <span className={style.text}>{level}</span>
    </span>
  );
}
