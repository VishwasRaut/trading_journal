"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/format";

export function EquityCurve({
  data,
  currency = "USD",
}: {
  data: { date: string; equity: number }[];
  currency?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="grid h-72 place-items-center text-sm text-muted-foreground">
        Close a trade to see your equity curve.
      </div>
    );
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => format(parseISO(d), "MMM d")}
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
            cursor={{ stroke: "var(--primary)", strokeOpacity: 0.4 }}
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              const v = payload[0].value as number;
              return (
                <div className="rounded-lg border border-border/60 bg-popover/95 p-2 text-xs shadow-lg backdrop-blur">
                  <div className="text-muted-foreground">
                    {format(parseISO(label as string), "MMM d, yyyy")}
                  </div>
                  <div className="font-medium">
                    Equity: {formatCurrency(v, currency)}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#equityGrad)"
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
