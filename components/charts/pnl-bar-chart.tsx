"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PnlPoint } from "@/lib/analytics";
import { formatCurrency, formatSigned } from "@/lib/format";

export function PnlBarChart({
  data,
  currency = "USD",
  height = 288,
}: {
  data: PnlPoint[];
  currency?: string;
  height?: number;
}) {
  if (!data.length) {
    return (
      <div className="grid h-72 place-items-center text-sm text-muted-foreground">
        Not enough trades to chart yet.
      </div>
    );
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            stroke="var(--muted-foreground)"
            fontSize={11}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(v) => formatCurrency(v, currency)}
            width={80}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const p = payload[0].payload as PnlPoint;
              return (
                <div className="rounded-lg border border-border/60 bg-popover/95 p-2 text-xs shadow-lg backdrop-blur">
                  <div className="text-muted-foreground">{p.label}</div>
                  <div
                    className={`font-medium ${
                      p.pnl >= 0 ? "text-profit" : "text-loss"
                    }`}
                  >
                    {formatSigned(p.pnl, currency)}
                  </div>
                  <div className="text-muted-foreground">
                    {p.count} trade{p.count === 1 ? "" : "s"}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="pnl" radius={[6, 6, 0, 0]} animationDuration={600}>
            {data.map((p, i) => (
              <Cell
                key={i}
                fill={p.pnl >= 0 ? "var(--profit)" : "var(--loss)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
