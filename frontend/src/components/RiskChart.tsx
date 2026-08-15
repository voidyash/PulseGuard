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
import type { RiskTimelinePoint } from "../lib/types";

interface RiskChartProps {
  points: RiskTimelinePoint[];
}

interface ChartPoint extends RiskTimelinePoint {
  label: string;
}

export function RiskChart({ points }: RiskChartProps) {
  const data: ChartPoint[] = points.map((point) => ({ ...point, label: formatTime(point.timestamp) }));
  return (
    <div className="h-52">
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
            width={44}
            domain={[0, 1]}
            tick={{ fontSize: 11, fill: "var(--color-n-400)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
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
            formatter={(value: unknown, name: unknown) => [
              typeof value === "number" ? `${Math.round(value * 100)}%` : "-",
              name === "risk" ? "Risk" : "Confidence",
            ]}
          />
          <ReferenceLine
            y={0.7}
            stroke="var(--color-critical)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{ value: "critical ≥70%", position: "insideTopRight", fontSize: 11, fill: "var(--color-n-600)" }}
          />
          <ReferenceLine
            y={0.45}
            stroke="var(--color-warning)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{ value: "warning ≥45%", position: "insideBottomRight", fontSize: 11, fill: "var(--color-n-600)" }}
          />
          <Line
            type="monotone"
            dataKey="risk"
            name="risk"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--color-accent)" }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="confidence"
            name="confidence"
            stroke="var(--color-n-400)"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
