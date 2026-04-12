"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface MetricsChartProps {
  data: { time: string; value: number }[];
  title: string;
  unit?: string;
  color?: string;
  type?: "line" | "area";
  height?: number;
}

export function MetricsChart({
  data,
  title,
  unit = "",
  color = "#3b82f6",
  type = "area",
  height = 200,
}: MetricsChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        אין נתונים זמינים
      </div>
    );
  }

  const Chart = type === "area" ? AreaChart : LineChart;

  return (
    <div>
      <p className="text-sm font-medium mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => v}
          />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}${unit}`} width={50} />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)}${unit}`, title]}
            labelFormatter={(label) => `${label}`}
          />
          {type === "area" ? (
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
