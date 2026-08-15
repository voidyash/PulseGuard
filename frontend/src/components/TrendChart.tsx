import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTime } from "../lib/format";
import type { TimeSeriesPoint } from "../lib/types";

interface TrendChartProps {
  title: string;
  unit: string;
  baseline: number;
  points: TimeSeriesPoint[];
}

interface ChartPoint extends TimeSeriesPoint {
  label: string;
}

function renderDot(props: { cx?: number; cy?: number; payload?: ChartPoint }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined) {
    return null;
  }
  if (payload?.is_anomaly && payload.value !== null) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="var(--color-critical)"
        stroke="var(--color-n-0)"
        strokeWidth={1.5}
      />
    );
  }
  return <circle cx={cx} cy={cy} r={2.5} fill="var(--color-accent)" />;
}

function summarize(points: TimeSeriesPoint[]): string {
  const observed = points.filter((point) => point.value !== null);
  if (observed.length === 0) {
    return "No measurements recorded for this parameter.";
  }
  const first = observed[0].value as number;
  const last = observed[observed.length - 1].value as number;
  const trend = observed[observed.length - 1].trend_short;
  const anomalyCount = observed.filter((point) => point.is_anomaly).length;
  return `${observed.length} measurements from ${first} to ${last}; short-term trend ${trend}; ${anomalyCount} flagged anomaly or anomalies.`;
}

export function TrendChart({ title, unit, baseline, points }: TrendChartProps) {
  const data: ChartPoint[] = points.map((point) => ({ ...point, label: formatTime(point.timestamp) }));
  const summary = summarize(points);
  return (
    <figure>
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-n-950">{title}</span>
        <span className="font-mono text-xs text-n-400">
          baseline {baseline}
          {unit}
        </span>
      </figcaption>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-n-100)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--color-n-400)" }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              width={40}
              domain={["auto", "auto"]}
              tick={{ fontSize: 11, fill: "var(--color-n-400)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}${unit}`}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid var(--color-n-100)",
                backgroundColor: "var(--color-n-0)",
              }}
              labelStyle={{ color: "var(--color-n-950)" }}
              itemStyle={{ color: "var(--color-n-800)" }}
            />
            <ReferenceLine
              y={baseline}
              stroke="var(--color-n-400)"
              strokeDasharray="4 4"
              label={{ value: "baseline", position: "insideBottomRight", fontSize: 11, fill: "var(--color-n-400)" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              name="value"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={renderDot}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="rolling_mean"
              name="rolling mean"
              stroke="var(--color-n-400)"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">{summary}</p>
    </figure>
  );
}
