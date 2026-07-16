import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";
import type { Direction, TradeRow } from "@/types/database";

export type PnlPoint = { label: string; date: string; pnl: number; count: number };

export function computePnl(
  entry: number,
  exit: number,
  quantity: number,
  direction: Direction,
  fees = 0,
  lotSize?: number | null,
): number {
  const size = quantity * (lotSize ?? 1);
  const gross = direction === "long" ? (exit - entry) * size : (entry - exit) * size;
  return round(gross - fees);
}

export function pnlPercent(
  entry: number,
  exit: number,
  direction: Direction,
): number {
  if (!entry) return 0;
  const raw = direction === "long" ? (exit - entry) / entry : (entry - exit) / entry;
  return round(raw * 100);
}

export function closedTrades<T extends TradeRow>(trades: T[]): T[] {
  return trades.filter((t) => t.status === "closed" && t.pnl !== null);
}

export function totalPnl(trades: TradeRow[]): number {
  return round(closedTrades(trades).reduce((s, t) => s + (t.pnl ?? 0), 0));
}

export function winRate(trades: TradeRow[]): number {
  const closed = closedTrades(trades);
  if (closed.length === 0) return 0;
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  return round((wins / closed.length) * 100);
}

export function avgRiskReward(trades: TradeRow[]): number {
  const closed = closedTrades(trades);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closed.filter((t) => (t.pnl ?? 0) < 0);
  if (wins.length === 0 || losses.length === 0) return 0;
  const avgWin = wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length;
  const avgLoss =
    Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0)) / losses.length;
  if (avgLoss === 0) return 0;
  return round(avgWin / avgLoss);
}

export function bestTrade<T extends TradeRow>(trades: T[]): T | null {
  const closed = closedTrades(trades);
  if (closed.length === 0) return null;
  return closed.reduce((best, t) =>
    (t.pnl ?? 0) > (best.pnl ?? 0) ? t : best,
  );
}

export function worstTrade<T extends TradeRow>(trades: T[]): T | null {
  const closed = closedTrades(trades);
  if (closed.length === 0) return null;
  return closed.reduce((worst, t) =>
    (t.pnl ?? 0) < (worst.pnl ?? 0) ? t : worst,
  );
}

/** Current streak: positive = consecutive winning trades, negative = losing. */
export function currentStreak(trades: TradeRow[]): number {
  const closed = closedTrades(trades)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.exit_at ?? b.entry_at).getTime() -
        new Date(a.exit_at ?? a.entry_at).getTime(),
    );
  if (closed.length === 0) return 0;
  const firstWin = (closed[0].pnl ?? 0) > 0;
  let streak = 0;
  for (const t of closed) {
    const isWin = (t.pnl ?? 0) > 0;
    if (isWin === firstWin) streak++;
    else break;
  }
  return firstWin ? streak : -streak;
}

function bucketRef(date: Date) {
  return date.toISOString();
}

export function groupTradesByWeek(trades: TradeRow[]): PnlPoint[] {
  const buckets = new Map<string, PnlPoint>();
  for (const t of closedTrades(trades)) {
    const d = parseISO(t.exit_at ?? t.entry_at);
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    const key = bucketRef(start);
    const existing = buckets.get(key) ?? {
      label: `${format(start, "MMM d")}–${format(end, "d")}`,
      date: start.toISOString(),
      pnl: 0,
      count: 0,
    };
    existing.pnl = round(existing.pnl + (t.pnl ?? 0));
    existing.count += 1;
    buckets.set(key, existing);
  }
  return [...buckets.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function groupTradesByMonth(trades: TradeRow[]): PnlPoint[] {
  const buckets = new Map<string, PnlPoint>();
  for (const t of closedTrades(trades)) {
    const d = parseISO(t.exit_at ?? t.entry_at);
    const start = startOfMonth(d);
    const key = bucketRef(start);
    const existing = buckets.get(key) ?? {
      label: format(start, "MMM yyyy"),
      date: start.toISOString(),
      pnl: 0,
      count: 0,
    };
    existing.pnl = round(existing.pnl + (t.pnl ?? 0));
    existing.count += 1;
    buckets.set(key, existing);
  }
  return [...buckets.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export type EquityPoint = {
  date: string;
  ts: number;
  equity: number;
  pnl: number;
  symbol: string;
  drawdown: number;
};

export function equityCurve(
  trades: TradeRow[],
  startingCapital = 0,
): { date: string; equity: number }[] {
  const sorted = closedTrades(trades)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.exit_at ?? a.entry_at).getTime() -
        new Date(b.exit_at ?? b.entry_at).getTime(),
    );
  let equity = startingCapital;
  return sorted.map((t) => {
    equity = round(equity + (t.pnl ?? 0));
    return {
      date: format(parseISO(t.exit_at ?? t.entry_at), "yyyy-MM-dd"),
      equity,
    };
  });
}

/** Rich equity curve for the hero chart — includes running drawdown. */
export function equityCurveRich(
  trades: TradeRow[],
  startingCapital = 0,
): EquityPoint[] {
  const sorted = closedTrades(trades)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.exit_at ?? a.entry_at).getTime() -
        new Date(b.exit_at ?? b.entry_at).getTime(),
    );
  let equity = startingCapital;
  let peak = startingCapital;
  return sorted.map((t) => {
    equity = round(equity + (t.pnl ?? 0));
    peak = Math.max(peak, equity);
    const d = parseISO(t.exit_at ?? t.entry_at);
    return {
      date: format(d, "yyyy-MM-dd"),
      ts: d.getTime(),
      equity,
      pnl: t.pnl ?? 0,
      symbol: t.symbol,
      drawdown: round(equity - peak),
    };
  });
}

/** Maximum peak-to-trough drawdown in absolute currency. */
export function maxDrawdown(
  trades: TradeRow[],
  startingCapital = 0,
): { amount: number; percent: number } {
  const curve = equityCurveRich(trades, startingCapital);
  if (curve.length === 0) return { amount: 0, percent: 0 };
  let peak = startingCapital;
  let maxDdAmount = 0;
  let maxDdPercent = 0;
  for (const p of curve) {
    peak = Math.max(peak, p.equity);
    const dd = p.equity - peak;
    if (dd < maxDdAmount) maxDdAmount = dd;
    const pct = peak !== 0 ? (dd / peak) * 100 : 0;
    if (pct < maxDdPercent) maxDdPercent = pct;
  }
  return { amount: round(maxDdAmount), percent: round(maxDdPercent) };
}

/** Expectancy per trade = winRate * avgWin - lossRate * |avgLoss|. */
export function expectancy(trades: TradeRow[]): number {
  const closed = closedTrades(trades);
  if (closed.length === 0) return 0;
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closed.filter((t) => (t.pnl ?? 0) < 0);
  const wr = wins.length / closed.length;
  const lr = losses.length / closed.length;
  const avgWin = wins.length
    ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length
    : 0;
  const avgLoss = losses.length
    ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length)
    : 0;
  return round(wr * avgWin - lr * avgLoss);
}

/** Long vs Short breakdown. */
export function longShortBreakdown(trades: TradeRow[]): {
  long: { count: number; pnl: number; winRate: number };
  short: { count: number; pnl: number; winRate: number };
} {
  const closed = closedTrades(trades);
  function stats(list: TradeRow[]) {
    if (list.length === 0) return { count: 0, pnl: 0, winRate: 0 };
    const pnl = round(list.reduce((s, t) => s + (t.pnl ?? 0), 0));
    const wins = list.filter((t) => (t.pnl ?? 0) > 0).length;
    return { count: list.length, pnl, winRate: round((wins / list.length) * 100) };
  }
  return {
    long: stats(closed.filter((t) => t.direction === "long")),
    short: stats(closed.filter((t) => t.direction === "short")),
  };
}

/** P&L by day of week (Mon..Sun, 0..6). */
export function dayOfWeekPnl(
  trades: TradeRow[],
): { day: string; pnl: number; count: number; winRate: number }[] {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const buckets = Array.from({ length: 7 }, () => ({
    pnl: 0,
    count: 0,
    wins: 0,
  }));
  for (const t of closedTrades(trades)) {
    const d = parseISO(t.exit_at ?? t.entry_at);
    // JS getDay(): Sun=0..Sat=6 → shift to Mon=0..Sun=6
    const idx = (d.getDay() + 6) % 7;
    buckets[idx].pnl = round(buckets[idx].pnl + (t.pnl ?? 0));
    buckets[idx].count += 1;
    if ((t.pnl ?? 0) > 0) buckets[idx].wins += 1;
  }
  return buckets.map((b, i) => ({
    day: labels[i],
    pnl: b.pnl,
    count: b.count,
    winRate: b.count ? round((b.wins / b.count) * 100) : 0,
  }));
}

/** P&L by hour of day (0..23) — great for spotting your best trading hours. */
export function hourOfDayPnl(
  trades: TradeRow[],
): { hour: number; pnl: number; count: number }[] {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    pnl: 0,
    count: 0,
  }));
  for (const t of closedTrades(trades)) {
    const d = parseISO(t.entry_at);
    const h = d.getHours();
    buckets[h].pnl = round(buckets[h].pnl + (t.pnl ?? 0));
    buckets[h].count += 1;
  }
  return buckets;
}

/** P&L grouped by symbol. */
export function symbolPerformance(
  trades: TradeRow[],
): { symbol: string; pnl: number; count: number; winRate: number }[] {
  const map = new Map<string, { pnl: number; count: number; wins: number }>();
  for (const t of closedTrades(trades)) {
    const cur = map.get(t.symbol) ?? { pnl: 0, count: 0, wins: 0 };
    cur.pnl = round(cur.pnl + (t.pnl ?? 0));
    cur.count += 1;
    if ((t.pnl ?? 0) > 0) cur.wins += 1;
    map.set(t.symbol, cur);
  }
  return Array.from(map.entries())
    .map(([symbol, v]) => ({
      symbol,
      pnl: v.pnl,
      count: v.count,
      winRate: round((v.wins / v.count) * 100),
    }))
    .sort((a, b) => b.pnl - a.pnl);
}

export function dailyPnlMap(
  trades: TradeRow[],
): { day: string; value: number; count: number }[] {
  const map = new Map<string, { value: number; count: number }>();
  for (const t of closedTrades(trades)) {
    const d = parseISO(t.exit_at ?? t.entry_at);
    const key = format(d, "yyyy-MM-dd");
    const cur = map.get(key) ?? { value: 0, count: 0 };
    cur.value = round(cur.value + (t.pnl ?? 0));
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.entries()].map(([day, v]) => ({
    day,
    value: v.value,
    count: v.count,
  }));
}

export function monthOverMonthChange(trades: TradeRow[]): number {
  const monthly = groupTradesByMonth(trades);
  if (monthly.length < 2) return 0;
  const [prev, curr] = monthly.slice(-2);
  if (prev.pnl === 0) return currentSign(curr.pnl) * 100;
  return round(((curr.pnl - prev.pnl) / Math.abs(prev.pnl)) * 100);
}

export function daysTraded(trades: TradeRow[]): number {
  const days = new Set(
    closedTrades(trades).map((t) =>
      format(parseISO(t.exit_at ?? t.entry_at), "yyyy-MM-dd"),
    ),
  );
  return days.size;
}

export function averageHoldDays(trades: TradeRow[]): number {
  const closed = closedTrades(trades).filter((t) => t.exit_at);
  if (closed.length === 0) return 0;
  const total = closed.reduce(
    (sum, t) =>
      sum + differenceInCalendarDays(parseISO(t.exit_at!), parseISO(t.entry_at)),
    0,
  );
  return round(total / closed.length);
}

function currentSign(n: number) {
  return n === 0 ? 0 : n > 0 ? 1 : -1;
}

function round(n: number, digits = 2) {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
