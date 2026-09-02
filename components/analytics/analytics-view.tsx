"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  TrendingUp,
  Target,
  Activity,
  Clock,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PnlBarChart } from "@/components/charts/pnl-bar-chart";
import { WinRateDonut } from "@/components/charts/win-rate-donut";
import { DayOfWeekChart } from "@/components/charts/day-of-week-chart";
import {
  bestTrade,
  worstTrade,
  currentStreak,
  groupTradesByMonth,
  groupTradesByWeek,
  closedTrades,
  avgRiskReward,
  averageHoldDays,
  daysTraded,
  maxDrawdown,
  expectancy,
  expectancyR,
  profitFactor,
  sharpeRatio,
  sortinoRatio,
  calmarRatio,
  kellyPercent,
  recoveryFactor,
  longShortBreakdown,
  dayOfWeekPnl,
  hourOfDayPnl,
  sessionPerformance,
  symbolPerformance,
  playbookPerformance,
  rollingMetrics,
  avgRMultiples,
} from "@/lib/analytics";
import { formatSigned, formatPercent, formatTradeDate } from "@/lib/format";
import type { TradeWithRelations } from "@/lib/trades";
import type { PlaybookRow } from "@/types/database";

export function AnalyticsView({
  trades,
  currency,
  playbooks = [],
  startingCapital = 0,
}: {
  trades: TradeWithRelations[];
  currency: string;
  playbooks?: PlaybookRow[];
  startingCapital?: number;
}) {
  const [tag, setTag] = useState<string>("all");

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const t of trades) for (const tg of t.trade_tags) s.add(tg.tag);
    return Array.from(s).sort();
  }, [trades]);

  const filtered = useMemo(() => {
    if (tag === "all") return trades;
    return trades.filter((t) => t.trade_tags.some((tg) => tg.tag === tag));
  }, [trades, tag]);

  const closed = closedTrades(filtered);
  const weeklyBuckets = groupTradesByWeek(filtered);
  const monthly = groupTradesByMonth(filtered);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const losses = closed.filter((t) => (t.pnl ?? 0) < 0).length;
  const best = bestTrade(filtered);
  const worst = worstTrade(filtered);
  const streak = currentStreak(filtered);
  const rr = avgRiskReward(filtered);
  const holdDays = averageHoldDays(filtered);
  const activeDays = daysTraded(filtered);
  const dd = maxDrawdown(filtered, startingCapital);
  const exp = expectancy(filtered);
  const expR = expectancyR(filtered);
  const pf = profitFactor(filtered);
  const sharpe = sharpeRatio(filtered);
  const sortino = sortinoRatio(filtered);
  const calmar = calmarRatio(filtered, startingCapital);
  const kelly = kellyPercent(filtered);
  const recovery = recoveryFactor(filtered, startingCapital);
  const rMults = avgRMultiples(filtered);
  const ls = longShortBreakdown(filtered);
  const dow = dayOfWeekPnl(filtered);
  const hod = hourOfDayPnl(filtered);
  const sessions = sessionPerformance(filtered);
  const bySymbol = symbolPerformance(filtered).slice(0, 8);
  const byPlaybook = playbookPerformance(filtered);
  const playbookById = useMemo(() => {
    const m = new Map<string, PlaybookRow>();
    for (const p of playbooks) m.set(p.id, p);
    return m;
  }, [playbooks]);
  const rolling = rollingMetrics(filtered, 20);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filter by tag:</span>
          <Select value={tag} onValueChange={(v) => setTag(v ?? "all")}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {closed.length} closed trade{closed.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>P&L over time</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="weekly">
              <TabsList>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
              <TabsContent value="weekly" className="mt-4">
                <PnlBarChart data={weeklyBuckets} currency={currency} />
              </TabsContent>
              <TabsContent value="monthly" className="mt-4">
                <PnlBarChart data={monthly} currency={currency} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Win rate</CardTitle>
          </CardHeader>
          <CardContent>
            <WinRateDonut wins={wins} losses={losses} />
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-profit/10 py-2">
                <div className="text-lg font-semibold text-profit">{wins}</div>
                <div className="text-xs text-muted-foreground">Wins</div>
              </div>
              <div className="rounded-lg bg-loss/10 py-2">
                <div className="text-lg font-semibold text-loss">{losses}</div>
                <div className="text-xs text-muted-foreground">Losses</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Expectancy (R)"
          value={expR.toFixed(2)}
          hint={
            rMults.avgWinR || rMults.avgLossR
              ? `+${rMults.avgWinR}R win · ${rMults.avgLossR}R loss`
              : "log initial_risk to see"
          }
          tone={expR > 0 ? "profit" : expR < 0 ? "loss" : undefined}
          icon={<Target className="size-4" />}
        />
        <StatCard
          label="Profit factor"
          value={pf === Infinity ? "∞" : pf.toFixed(2)}
          hint=">1.5 is a healthy edge"
          tone={pf >= 1.5 ? "profit" : pf < 1 ? "loss" : undefined}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Sharpe"
          value={sharpe.toFixed(2)}
          hint="risk-adjusted return"
          tone={sharpe > 1 ? "profit" : sharpe < 0 ? "loss" : undefined}
          icon={<Activity className="size-4" />}
        />
        <StatCard
          label="Sortino"
          value={sortino.toFixed(2)}
          hint="downside-adjusted"
          tone={sortino > 1 ? "profit" : sortino < 0 ? "loss" : undefined}
          icon={<Activity className="size-4" />}
        />
        <StatCard
          label="Calmar"
          value={calmar.toFixed(2)}
          hint="return / max DD"
          icon={<Activity className="size-4" />}
        />
        <StatCard
          label="Kelly %"
          value={`${kelly.toFixed(1)}%`}
          hint="optimal risk per trade"
          icon={<Target className="size-4" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Avg R:R"
          value={rr.toFixed(2)}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Expectancy"
          value={formatSigned(exp, currency)}
          tone={exp >= 0 ? "profit" : "loss"}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Max drawdown"
          value={formatSigned(dd.amount, currency)}
          hint={`${dd.percent.toFixed(1)}% from peak`}
          tone="loss"
          icon={<ArrowDownRight className="size-4" />}
        />
        <StatCard
          label={streak >= 0 ? "Winning streak" : "Losing streak"}
          value={`${Math.abs(streak)}`}
          tone={streak >= 0 ? "profit" : "loss"}
          icon={<Flame className="size-4" />}
        />
        <StatCard
          label="Avg hold"
          value={`${holdDays}d`}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Active days"
          value={`${activeDays}`}
          icon={<TrendingUp className="size-4" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BestWorstCard
          trade={best}
          currency={currency}
          label="Best trade"
          tone="profit"
        />
        <BestWorstCard
          trade={worst}
          currency={currency}
          label="Worst trade"
          tone="loss"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Long vs Short</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <LongShortStat
              side="Long"
              stats={ls.long}
              tone="profit"
              currency={currency}
            />
            <LongShortStat
              side="Short"
              stats={ls.short}
              tone="loss"
              currency={currency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best & worst symbols</CardTitle>
          </CardHeader>
          <CardContent>
            {bySymbol.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Log more trades to see per-symbol performance.
              </p>
            ) : (
              <div className="grid gap-1.5">
                {bySymbol.map((s) => (
                  <div
                    key={s.symbol}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-border/40 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{s.symbol}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.count} · {s.winRate.toFixed(0)}%
                    </span>
                    <span
                      className={`num font-medium tabular-nums ${
                        s.pnl >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatSigned(s.pnl, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By day of week</CardTitle>
            <div className="text-muted-foreground text-sm">
              Which weekdays are your best?
            </div>
          </CardHeader>
          <CardContent>
            <DayOfWeekChart data={dow} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4 text-primary" /> By session
            </CardTitle>
            <div className="text-muted-foreground text-sm">
              Trading sessions (UTC-based). Overlap = London + NY, the most
              liquid window.
            </div>
          </CardHeader>
          <CardContent>
            <SessionsGrid sessions={sessions} currency={currency} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By hour of day</CardTitle>
          <div className="text-muted-foreground text-sm">
            Local machine time — spot your best trading hours.
          </div>
        </CardHeader>
        <CardContent>
          <HourHeatmap data={hod} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" /> By playbook
          </CardTitle>
          <div className="text-muted-foreground text-sm">
            Which of your setups actually make money.
          </div>
        </CardHeader>
        <CardContent>
          {byPlaybook.length === 0 || (byPlaybook.length === 1 && byPlaybook[0].playbook_id === null) ? (
            <p className="text-muted-foreground text-sm">
              Assign trades to a playbook to see per-setup performance.
            </p>
          ) : (
            <div className="grid gap-1.5">
              {byPlaybook.map((s) => {
                const p = s.playbook_id ? playbookById.get(s.playbook_id) : null;
                const name = p?.name ?? "No playbook";
                return (
                  <div
                    key={s.playbook_id ?? "none"}
                    className="grid grid-cols-[1fr_repeat(4,auto)] items-center gap-3 rounded-md border border-border/40 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{
                          background: p?.color ?? "var(--muted)",
                        }}
                      />
                      {name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.count} · {s.winRate.toFixed(0)}%
                    </span>
                    <span
                      className={`num text-xs tabular-nums ${
                        s.expectancyR > 0
                          ? "text-profit"
                          : s.expectancyR < 0
                            ? "text-loss"
                            : "text-muted-foreground"
                      }`}
                    >
                      {s.expectancyR.toFixed(2)}R
                    </span>
                    <span className="num text-xs text-muted-foreground tabular-nums">
                      pf {s.profitFactor === Infinity
                        ? "∞"
                        : s.profitFactor.toFixed(2)}
                    </span>
                    <span
                      className={`num font-medium tabular-nums ${
                        s.pnl >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatSigned(s.pnl, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rolling performance (20-trade window)</CardTitle>
          <div className="text-muted-foreground text-sm">
            Is your edge holding up? Each point is the last 20 trades ending
            there.
          </div>
        </CardHeader>
        <CardContent>
          <RollingSpark data={rolling} currency={currency} />
        </CardContent>
      </Card>
    </div>
  );
}

function SessionsGrid({
  sessions,
  currency,
}: {
  sessions: {
    session: string;
    pnl: number;
    count: number;
    winRate: number;
  }[];
  currency: string;
}) {
  const total = Math.max(1, ...sessions.map((s) => Math.abs(s.pnl)));
  return (
    <div className="grid gap-2">
      {sessions.map((s) => {
        const positive = s.pnl >= 0;
        const width = (Math.abs(s.pnl) / total) * 100;
        return (
          <div key={s.session} className="grid gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{s.session}</span>
              <span className="text-muted-foreground">
                {s.count} · {s.winRate.toFixed(0)}%
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted/40">
              {s.count > 0 && (
                <div
                  className={`absolute top-0 h-full ${
                    positive ? "bg-profit/70" : "bg-loss/70"
                  } ${positive ? "left-1/2" : "right-1/2"}`}
                  style={{ width: `${width / 2}%` }}
                />
              )}
              <div className="absolute inset-y-0 left-1/2 w-px bg-border/60" />
            </div>
            <div
              className={`text-xs tabular-nums ${
                s.pnl === 0
                  ? "text-muted-foreground"
                  : positive
                    ? "text-profit"
                    : "text-loss"
              }`}
            >
              {s.pnl === 0 ? "—" : formatSigned(s.pnl, currency)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HourHeatmap({
  data,
  currency,
}: {
  data: { hour: number; pnl: number; count: number }[];
  currency: string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));
  return (
    <div className="grid grid-cols-12 gap-1 md:grid-cols-24">
      {data.map((d) => {
        const intensity = Math.min(1, Math.abs(d.pnl) / max);
        const bg =
          d.pnl > 0
            ? `color-mix(in oklab, var(--profit) ${20 + intensity * 60}%, transparent)`
            : d.pnl < 0
              ? `color-mix(in oklab, var(--loss) ${20 + intensity * 60}%, transparent)`
              : "var(--muted)";
        return (
          <div
            key={d.hour}
            className="grid aspect-square place-items-center rounded-md border border-border/40 text-[10px]"
            style={{ background: bg }}
            title={`${String(d.hour).padStart(2, "0")}:00 — ${formatSigned(d.pnl, currency)} (${d.count} trades)`}
          >
            <span className="opacity-80">
              {String(d.hour).padStart(2, "0")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RollingSpark({
  data,
  currency,
}: {
  data: {
    index: number;
    date: string;
    winRate: number;
    expectancy: number;
    expectancyR: number;
  }[];
  currency: string;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Need at least 20 closed trades to compute rolling metrics.
      </p>
    );
  }
  const last = data[data.length - 1];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <RollingStat
        label="Current win rate"
        value={`${last.winRate.toFixed(0)}%`}
        series={data.map((d) => d.winRate)}
        tone={last.winRate >= 50 ? "profit" : "loss"}
      />
      <RollingStat
        label="Current expectancy"
        value={formatSigned(last.expectancy, currency)}
        series={data.map((d) => d.expectancy)}
        tone={last.expectancy > 0 ? "profit" : "loss"}
      />
      <RollingStat
        label="Current expectancy (R)"
        value={last.expectancyR.toFixed(2)}
        series={data.map((d) => d.expectancyR)}
        tone={last.expectancyR > 0 ? "profit" : "loss"}
      />
    </div>
  );
}

function RollingStat({
  label,
  value,
  series,
  tone,
}: {
  label: string;
  value: string;
  series: number[];
  tone: "profit" | "loss";
}) {
  // Tiny inline sparkline built with SVG so we don't add another recharts dep.
  const w = 200;
  const h = 40;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const points = series
    .map((v, i) => {
      const x = (i / Math.max(1, series.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke = tone === "profit" ? "var(--profit)" : "var(--loss)";
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`num mt-1 text-2xl font-semibold ${
          tone === "profit" ? "text-profit" : "text-loss"
        }`}
      >
        {value}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full">
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          points={points}
        />
      </svg>
    </div>
  );
}

function LongShortStat({
  side,
  stats,
  tone,
  currency,
}: {
  side: string;
  stats: { count: number; pnl: number; winRate: number };
  tone: "profit" | "loss";
  currency: string;
}) {
  const positive = stats.pnl >= 0;
  return (
    <div
      className={`grid gap-1 rounded-xl border p-4 ${
        tone === "profit"
          ? "border-profit/30 bg-profit/5"
          : "border-loss/30 bg-loss/5"
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {side}
      </div>
      <div
        className={`num text-xl font-semibold tracking-tight ${
          stats.count === 0
            ? "text-muted-foreground"
            : positive
              ? "text-profit"
              : "text-loss"
        }`}
      >
        {stats.count === 0 ? "—" : formatSigned(stats.pnl, currency)}
      </div>
      <div className="text-xs text-muted-foreground">
        {stats.count === 0
          ? "no trades"
          : `${stats.count} trades · ${stats.winRate.toFixed(0)}% win rate`}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "profit" | "loss";
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </div>
          <div
            className={`num mt-1 text-lg font-semibold tracking-tight md:text-xl ${
              tone === "profit"
                ? "text-profit"
                : tone === "loss"
                  ? "text-loss"
                  : ""
            }`}
          >
            {value}
          </div>
          {hint && (
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {hint}
            </div>
          )}
        </div>
        <div
          className={`grid size-9 shrink-0 place-items-center rounded-lg ${
            tone === "profit"
              ? "bg-profit/10 text-profit"
              : tone === "loss"
                ? "bg-loss/10 text-loss"
                : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function BestWorstCard({
  trade,
  label,
  tone,
  currency,
}: {
  trade: TradeWithRelations | null;
  label: string;
  tone: "profit" | "loss";
  currency: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={tone === "profit" ? "border-profit/40" : "border-loss/40"}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{label}</CardTitle>
          {tone === "profit" ? (
            <ArrowUpRight className="size-5 text-profit" />
          ) : (
            <ArrowDownRight className="size-5 text-loss" />
          )}
        </CardHeader>
        <CardContent>
          {!trade ? (
            <p className="text-muted-foreground text-sm">
              No closed trades yet.
            </p>
          ) : (
            <Link href={`/trades/${trade.id}`} className="grid gap-2">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-semibold">{trade.symbol}</div>
                <Badge variant="secondary" className="uppercase text-[10px]">
                  {trade.market}
                </Badge>
              </div>
              <div
                className={`text-lg font-semibold ${
                  tone === "profit" ? "text-profit" : "text-loss"
                }`}
              >
                {formatSigned(trade.pnl ?? 0, currency)}
                {trade.pnl_percent !== null && (
                  <span className="ml-2 text-xs">
                    {formatPercent(trade.pnl_percent)}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTradeDate(trade.entry_at)} · {trade.direction}
              </div>
            </Link>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
