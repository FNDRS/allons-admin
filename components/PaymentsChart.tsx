"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

function formatCurrency(value: number) {
  return `L. ${value.toLocaleString("es-HN", { maximumFractionDigits: 0 })}`;
}

export function PaymentsChart({
  data,
}: {
  data: Array<{ date: string; totalCents: number; count: number }>;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="futuristic-panel mt-4 p-6 text-center text-sm text-muted">
        Sin datos de pagos en los últimos 30 días.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("es-HN", {
      day: "2-digit",
      month: "short",
    }),
    gmv: Math.round(d.totalCents / 100),
    orders: d.count,
  }));

  return (
    <div className="futuristic-panel mt-4 p-5">
      <div className="eyebrow mb-4">Pagos por día (30d)</div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} barCategoryGap={2}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1f",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 11,
            }}
            labelStyle={{ color: "rgba(255,255,255,0.7)" }}
            formatter={(value) => [formatCurrency(Number(value)), "GMV"]}
          />
          <Bar dataKey="gmv" fill="#F67010" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
