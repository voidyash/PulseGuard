interface MetricProps {
  label: string;
  value: string;
  sub?: string;
}

export function Metric({ label, value, sub }: MetricProps) {
  return (
    <div className="rounded-md border border-n-100 bg-n-25 px-3 py-2.5">
      <div className="text-xs text-n-600">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-medium text-n-950">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-n-600">{sub}</div> : null}
    </div>
  );
}
