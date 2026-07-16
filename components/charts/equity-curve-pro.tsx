"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, subDays, startOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import { formatCurrency, formatSigned, formatPercent } from "@/lib/format";
import type { EquityPoint } from "@/lib/analytics";

type Range = "1W" | "1M" | "3M" | "6M" | "YTD" | "ALL";

const RANGES: { label: Range; days: number | "ytd" | "all" }[] = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "YTD", days: "ytd" },
  { label: "ALL", days: "all" },
];

export function EquityCurvePro({
  data,
  startingCapital = 0,
  currency = "USD",
}: {
  data: EquityPoint[];
  startingCapital?: number;
  currency?: string;
}) {
  const [range, setRange] = useState<Range>("ALL");

  const filtered = useMemo(() => {
    if (data.length === 0) return data;
    const cfg = RANGES.find((r) => r.label === range)!;
    if (cfg.days === "all") return data;
    const now = data[data.length - 1].ts;
    const cutoff =
      cfg.days === "ytd"
        ? startOfYear(new Date(now)).getTime()
        : subDays(new Date(now), cfg.days).getTime();
    return data.filter((p) => p.ts >= cutoff);
  }, [data, range]);

  const startEquity =
    filtered.length > 0 ? filtered[0].equity - filtered[0].pnl : startingCapital;
  const endEquity =
    filtered.length > 0 ? filtered[filtered.length - 1].equity : startingCapital;
  const delta = endEquity - startEquity;
  const deltaPct =
    startEquity !== 0 ? (delta / Math.abs(startEquity || 1)) * 100 : 0;

  const peak = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.reduce((best, p) => (p.equity > best.equity ? p : best));
  }, [filtered]);
  const trough = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.reduce((worst, p) =>
      p.equity < worst.equity ? p : worst,
    );
  }, [filtered]);

  const gradientId = "equityPremiumGrad";
  const glowId = "equityGlow";
  const trendPositive = delta >= 0;

  return (
    <div className="grid gap-4">
      {/* Header: big number + delta + range chips */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Account equity
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <motion.div
              key={endEquity}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="num font-display text-4xl leading-none tracking-tight md:text-5xl"
            >
              {formatCurrency(endEquity, currency)}
            </motion.div>
            <motion.div
              key={`d-${delta}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className={cn(
                "num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                trendPositive
                  ? "bg-profit/15 text-profit"
                  : "bg-loss/15 text-loss",
              )}
            >
              {trendPositive ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {formatSigned(delta, currency)} · {formatPercent(deltaPct, 1)}
            </motion.div>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/50 p-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setRange(r.label)}
              className={cn(
                "num relative rounded-full px-3 py-1 text-xs font-medium transition-colors",
                range === r.label
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {range === r.label && (
                <motion.span
                  layoutId="range-pill"
                  className="absolute inset-0 rounded-full bg-primary shadow-sm shadow-primary/30"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-72 w-full">
        {filtered.length === 0 ? (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
            Close a trade to see your equity curve.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filtered}
              margin={{ left: 8, right: 16, top: 20, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={trendPositive ? "var(--profit)" : "var(--loss)"}
                    stopOpacity={0.55}
                  />
                  <stop
                    offset="55%"
                    stopColor={trendPositive ? "var(--profit)" : "var(--loss)"}
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="100%"
                    stopColor={trendPositive ? "var(--profit)" : "var(--loss)"}
                    stopOpacity={0}
                  />
                </linearGradient>
                <filter id={glowId} x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid
                strokeDasharray="3 6"
                stroke="var(--border)"
                strokeOpacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="ts"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t) => format(new Date(t), "MMM d")}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.4}
                fontSize={11}
                tickMargin={8}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                strokeOpacity={0.4}
                fontSize={11}
                tickMargin={4}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  Math.abs(v) >= 1000
                    ? `${(v / 1000).toFixed(1)}k`
                    : `${v}`
                }
                width={54}
                domain={["dataMin", "dataMax"]}
              />
              <Tooltip
                cursor={{
                  stroke: "var(--primary)",
                  strokeOpacity: 0.55,
                  strokeDasharray: "3 3",
                }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload as EquityPoint;
                  const positive = p.pnl >= 0;
                  return (
                    <div className="min-w-[200px] rounded-xl border border-border/60 bg-popover/95 p-3 text-xs shadow-2xl shadow-black/25 backdrop-blur-lg ring-1 ring-foreground/5">
                      <div className="mb-2 flex items-center justify-between text-muted-foreground">
                        <span>{format(parseISO(p.date), "EEE, MMM d yyyy")}</span>
                        <span className="font-medium text-foreground">
                          {p.symbol}
                        </span>
                      </div>
                      <div className="grid gap-1">
                        <Row
                          label="Equity"
                          value={formatCurrency(p.equity, currency)}
                          strong
                        />
                        <Row
                          label="Trade P&L"
                          value={formatSigned(p.pnl, currency)}
                          tone={positive ? "profit" : "loss"}
                        />
                        {p.drawdown < 0 && (
                          <Row
                            label="Drawdown"
                            value={formatSigned(p.drawdown, currency)}
                            tone="loss"
                          />
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={trendPositive ? "var(--profit)" : "var(--loss)"}
                strokeWidth={2.25}
                fill={`url(#${gradientId})`}
                animationDuration={1000}
                dot={false}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: "var(--background)",
                  fill: trendPositive ? "var(--profit)" : "var(--loss)",
                  filter: `url(#${glowId})`,
                }}
              />
              {peak && filtered.length > 4 && (
                <ReferenceDot
                  x={peak.ts}
                  y={peak.equity}
                  r={4}
                  stroke="var(--background)"
                  strokeWidth={2}
                  fill="var(--profit)"
                  ifOverflow="visible"
                  label={{
                    value: "Peak",
                    position: "top",
                    fill: "var(--profit)",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}
              {trough &&
                trough.ts !== peak?.ts &&
                filtered.length > 4 &&
                trough.equity < startEquity && (
                  <ReferenceDot
                    x={trough.ts}
                    y={trough.equity}
                    r={4}
                    stroke="var(--background)"
                    strokeWidth={2}
                    fill="var(--loss)"
                    ifOverflow="visible"
                    label={{
                      value: "Low",
                      position: "bottom",
                      fill: "var(--loss)",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Trade ribbon — each closed trade as a mini bar (like a heartbeat) */}
      {filtered.length > 0 && <TradeRibbon points={filtered} />}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "profit" | "loss";
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "num tabular-nums",
          strong && "font-semibold",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function TradeRibbon({ points }: { points: EquityPoint[] }) {
  const maxAbs = useMemo(
    () => Math.max(1, ...points.map((p) => Math.abs(p.pnl))),
    [points],
  );
  return (
    <div className="pt-1">
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <span>Trade sequence</span>
        <span>{points.length} closed</span>
      </div>
      <div className="flex h-10 items-center gap-[2px] overflow-hidden rounded-md bg-muted/30 p-1">
        {points.map((p, i) => {
          const height = Math.max(4, (Math.abs(p.pnl) / maxAbs) * 100);
          const positive = p.pnl >= 0;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{
                delay: Math.min(i * 0.005, 0.3),
                duration: 0.2,
              }}
              style={{ height: `${height}%` }}
              className={cn(
                "flex-1 min-w-[2px] max-w-[8px] rounded-[2px] origin-center",
                positive ? "bg-profit/80" : "bg-loss/80",
              )}
              title={`${p.symbol} · ${p.pnl.toFixed(2)}`}
            />
          );
        })}
      </div>
    </div>
  );
}
