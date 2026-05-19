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

const CHART_DAYS = 30;

/** API solo devuelve días con ventas; sin esto un solo día llena todo el ancho del BarChart. */
function padDailySeries(
  data: Array<{ date: string; totalCents: number; count: number }>,
  days: number,
): Array<{ date: string; totalCents: number; count: number }> {
  const byDay = new Map<string, { totalCents: number; count: number }>();
  for (const d of data) {
    const key = d.date.slice(0, 10);
    byDay.set(key, { totalCents: d.totalCents, count: d.count });
  }

  const out: Array<{ date: string; totalCents: number; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const utc = new Date();
    utc.setUTCHours(12, 0, 0, 0);
    utc.setUTCDate(utc.getUTCDate() - i);
    const key = utc.toISOString().slice(0, 10);
    const row = byDay.get(key);
    out.push({
      date: key,
      totalCents: row?.totalCents ?? 0,
      count: row?.count ?? 0,
    });
  }
  return out;
}

export function PaymentsChart({
  data,
}: {
  data: Array<{ date: string; totalCents: number; count: number }>;
}) {
  const padded = padDailySeries(data ?? [], CHART_DAYS);
  const hasAnyPayment = padded.some((d) => d.totalCents > 0);

  if (!hasAnyPayment) {
    return (
      <div className="futuristic-panel mt-4 p-6 text-center text-sm text-muted">
        Sin datos de pagos en los últimos 30 días.
      </div>
    );
  }

  const chartData = padded.map((d) => ({
    dateKey: d.date,
    date: new Date(`${d.date}T12:00:00.000Z`).toLocaleDateString("es-HN", {
      day: "2-digit",
      month: "short",
    }),
    gmv: Math.round(d.totalCents / 100),
    orders: d.count,
  }));

  return (
    <div className="futuristic-panel mt-4 p-5">
      <div className="eyebrow mb-4">Pagos por día (30d)</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          margin={{ top: 6, right: 8, left: 0, bottom: 4 }}
          barCategoryGap="12%"
        >
          <XAxis
            dataKey="date"
            tick={{ fontSize: 8, fill: "rgba(255,255,255,0.45)" }}
            axisLine={false}
            tickLine={false}
            interval={4}
            minTickGap={8}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const p = payload[0].payload as {
                gmv: number;
                orders: number;
                dateKey: string;
              };
              const title = new Date(`${p.dateKey}T12:00:00.000Z`).toLocaleDateString(
                "es-HN",
                {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                },
              );
              return (
                <div
                  className="rounded-lg border px-3 py-2 text-[11px] shadow-lg"
                  style={{
                    backgroundColor: "#1a1a1f",
                    borderColor: "rgba(255,255,255,0.12)",
                  }}
                >
                  <div className="mb-1 text-white/75">{title}</div>
                  <div className="font-medium text-white">
                    GMV: {formatCurrency(p.gmv)}
                  </div>
                  <div className="mt-0.5 text-white/50">Órdenes: {p.orders}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="gmv" fill="#F67010" radius={[3, 3, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
