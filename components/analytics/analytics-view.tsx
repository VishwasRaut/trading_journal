"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ArrowUpRight, ArrowDownRight, Flame, TrendingUp } from "lucide-react";
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
  longShortBreakdown,
  dayOfWeekPnl,
  symbolPerformance,
} from "@/lib/analytics";
import { formatSigned, formatPercent } from "@/lib/format";
import type { TradeWithRelations } from "@/lib/trades";

export function AnalyticsView({
  trades,
  currency,
}: {
  trades: TradeWithRelations[];
  currency: string;
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
  const dd = maxDrawdown(filtered);
  const exp = expectancy(filtered);
  const ls = longShortBreakdown(filtered);
  const dow = dayOfWeekPnl(filtered);
  const bySymbol = symbolPerformance(filtered).slice(0, 8);

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
                {format(parseISO(trade.entry_at), "MMM d, yyyy")} · {trade.direction}
              </div>
            </Link>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
