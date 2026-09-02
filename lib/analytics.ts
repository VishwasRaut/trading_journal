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

// ============================================================
// R-multiple analytics — how the pros think
// ============================================================

/**
 * R-multiple = pnl / initial_risk. A "1R winner" made back the amount you
 * risked. Standard unit for measuring edge across position sizes and symbols.
 */
export function rMultiple(trade: TradeRow): number | null {
  if (
    trade.pnl == null ||
    trade.initial_risk == null ||
    trade.initial_risk === 0
  ) {
    return null;
  }
  return round(trade.pnl / trade.initial_risk);
}

export function tradesWithR<T extends TradeRow>(trades: T[]): T[] {
  return closedTrades(trades).filter(
    (t) => t.initial_risk != null && t.initial_risk > 0,
  );
}

/**
 * Expectancy in R = mean R-multiple per trade. Superior to dollar expectancy
 * because it's scale-invariant. > 0 means you have an edge.
 */
export function expectancyR(trades: TradeRow[]): number {
  const withR = tradesWithR(trades);
  if (withR.length === 0) return 0;
  const total = withR.reduce((s, t) => s + (rMultiple(t) ?? 0), 0);
  return round(total / withR.length);
}

/** Average R on wins vs losses — shows if you cut losers and let winners run. */
export function avgRMultiples(trades: TradeRow[]): {
  avgWinR: number;
  avgLossR: number;
} {
  const withR = tradesWithR(trades);
  const wins = withR
    .map((t) => rMultiple(t) ?? 0)
    .filter((r) => r > 0);
  const losses = withR.map((t) => rMultiple(t) ?? 0).filter((r) => r < 0);
  return {
    avgWinR: wins.length
      ? round(wins.reduce((s, r) => s + r, 0) / wins.length)
      : 0,
    avgLossR: losses.length
      ? round(losses.reduce((s, r) => s + r, 0) / losses.length)
      : 0,
  };
}

// ============================================================
// Pro metrics: profit factor, Sharpe, Sortino, Calmar, Kelly
// ============================================================

/** Profit factor = gross wins / |gross losses|. > 1.5 is a healthy edge. */
export function profitFactor(trades: TradeRow[]): number {
  const closed = closedTrades(trades);
  const grossWin = closed
    .filter((t) => (t.pnl ?? 0) > 0)
    .reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(
    closed
      .filter((t) => (t.pnl ?? 0) < 0)
      .reduce((s, t) => s + (t.pnl ?? 0), 0),
  );
  if (grossLoss === 0) return grossWin > 0 ? Infinity : 0;
  return round(grossWin / grossLoss);
}

/**
 * Sharpe ratio = mean return / std dev, annualized. Uses per-trade returns
 * (not per-day). `tradesPerYear` estimates annualization — 252 for daytraders,
 * 52 for swing. We use 252 as default.
 */
export function sharpeRatio(
  trades: TradeRow[],
  tradesPerYear = 252,
): number {
  const closed = closedTrades(trades);
  if (closed.length < 2) return 0;
  const returns = closed.map((t) => t.pnl ?? 0);
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return round((mean / std) * Math.sqrt(tradesPerYear));
}

/** Sortino ratio: like Sharpe but only penalizes downside volatility. */
export function sortinoRatio(
  trades: TradeRow[],
  tradesPerYear = 252,
): number {
  const closed = closedTrades(trades);
  if (closed.length < 2) return 0;
  const returns = closed.map((t) => t.pnl ?? 0);
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const downside = returns.filter((r) => r < 0);
  if (downside.length === 0) return 0;
  const downVariance =
    downside.reduce((s, r) => s + r ** 2, 0) / downside.length;
  const downStd = Math.sqrt(downVariance);
  if (downStd === 0) return 0;
  return round((mean / downStd) * Math.sqrt(tradesPerYear));
}

/**
 * Calmar ratio = total return / max drawdown %. Rewards steady equity growth
 * without deep drawdowns. > 3 is exceptional, > 1 is decent.
 */
export function calmarRatio(
  trades: TradeRow[],
  startingCapital = 0,
): number {
  const total = totalPnl(trades);
  const dd = maxDrawdown(trades, startingCapital);
  if (dd.percent === 0) return 0;
  const returnPct =
    startingCapital > 0 ? (total / startingCapital) * 100 : total;
  return round(returnPct / Math.abs(dd.percent));
}

/**
 * Kelly % (fractional): optimal fraction of capital to risk per trade for
 * long-run growth, given win rate p and payoff ratio b. Most pros use 0.25
 * Kelly ("quarter Kelly") because full Kelly is emotionally brutal.
 */
export function kellyPercent(trades: TradeRow[]): number {
  const closed = closedTrades(trades);
  if (closed.length === 0) return 0;
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closed.filter((t) => (t.pnl ?? 0) < 0);
  if (wins.length === 0 || losses.length === 0) return 0;
  const p = wins.length / closed.length;
  const avgWin = wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length;
  const avgLoss = Math.abs(
    losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length,
  );
  if (avgLoss === 0) return 0;
  const b = avgWin / avgLoss;
  const kelly = p - (1 - p) / b;
  return round(kelly * 100);
}

/** Recovery factor = |net profit / max drawdown|. > 5 is strong. */
export function recoveryFactor(
  trades: TradeRow[],
  startingCapital = 0,
): number {
  const total = totalPnl(trades);
  const dd = maxDrawdown(trades, startingCapital);
  if (dd.amount === 0) return 0;
  return round(Math.abs(total / dd.amount));
}

// ============================================================
// Session performance (forex-critical)
// ============================================================

export type Session = "asia" | "london" | "newyork" | "overlap" | "off";

/**
 * Bucket an entry UTC hour into a trading session. London-NY overlap
 * (13-16 UTC) is called out separately because it's the most liquid window.
 */
function sessionForHourUtc(hour: number): Session {
  if (hour >= 13 && hour < 16) return "overlap";
  if (hour >= 8 && hour < 16) return "london";
  if (hour >= 13 && hour < 21) return "newyork";
  if (hour >= 0 && hour < 8) return "asia";
  if (hour >= 21) return "asia";
  return "off";
}

const SESSION_LABEL: Record<Session, string> = {
  asia: "Asia",
  london: "London",
  newyork: "New York",
  overlap: "London/NY overlap",
  off: "Off-hours",
};

export function sessionPerformance(trades: TradeRow[]): {
  session: string;
  pnl: number;
  count: number;
  winRate: number;
}[] {
  const buckets = new Map<
    Session,
    { pnl: number; count: number; wins: number }
  >();
  for (const t of closedTrades(trades)) {
    const hour = new Date(t.entry_at).getUTCHours();
    const s = sessionForHourUtc(hour);
    const cur = buckets.get(s) ?? { pnl: 0, count: 0, wins: 0 };
    cur.pnl = round(cur.pnl + (t.pnl ?? 0));
    cur.count += 1;
    if ((t.pnl ?? 0) > 0) cur.wins += 1;
    buckets.set(s, cur);
  }
  const order: Session[] = ["asia", "london", "overlap", "newyork", "off"];
  return order.map((s) => {
    const b = buckets.get(s) ?? { pnl: 0, count: 0, wins: 0 };
    return {
      session: SESSION_LABEL[s],
      pnl: b.pnl,
      count: b.count,
      winRate: b.count ? round((b.wins / b.count) * 100) : 0,
    };
  });
}

// ============================================================
// Rolling metrics — are you improving?
// ============================================================

/**
 * Rolling window across trade sequence. Window size N means each point uses
 * the last N trades. Great for spotting when your edge starts decaying.
 */
export function rollingMetrics(
  trades: TradeRow[],
  window = 20,
): {
  index: number;
  date: string;
  winRate: number;
  expectancy: number;
  expectancyR: number;
}[] {
  const sorted = closedTrades(trades)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.exit_at ?? a.entry_at).getTime() -
        new Date(b.exit_at ?? b.entry_at).getTime(),
    );
  if (sorted.length < window) return [];
  const out: {
    index: number;
    date: string;
    winRate: number;
    expectancy: number;
    expectancyR: number;
  }[] = [];
  for (let i = window - 1; i < sorted.length; i++) {
    const slice = sorted.slice(i - window + 1, i + 1);
    out.push({
      index: i + 1,
      date: (slice[slice.length - 1].exit_at ??
        slice[slice.length - 1].entry_at).slice(0, 10),
      winRate: winRate(slice),
      expectancy: expectancy(slice),
      expectancyR: expectancyR(slice),
    });
  }
  return out;
}

// ============================================================
// Per-playbook analytics
// ============================================================

export type PlaybookStats = {
  playbook_id: string | null;
  count: number;
  pnl: number;
  winRate: number;
  expectancy: number;
  expectancyR: number;
  profitFactor: number;
  avgWinR: number;
  avgLossR: number;
};

/** Group closed trades by playbook and compute the pro metrics per setup. */
export function playbookPerformance(trades: TradeRow[]): PlaybookStats[] {
  const groups = new Map<string | null, TradeRow[]>();
  for (const t of closedTrades(trades)) {
    const key = t.playbook_id;
    const cur = groups.get(key) ?? [];
    cur.push(t);
    groups.set(key, cur);
  }
  return [...groups.entries()]
    .map(([id, list]) => {
      const r = avgRMultiples(list);
      return {
        playbook_id: id,
        count: list.length,
        pnl: round(list.reduce((s, t) => s + (t.pnl ?? 0), 0)),
        winRate: winRate(list),
        expectancy: expectancy(list),
        expectancyR: expectancyR(list),
        profitFactor: profitFactor(list),
        avgWinR: r.avgWinR,
        avgLossR: r.avgLossR,
      };
    })
    .sort((a, b) => b.pnl - a.pnl);
}

// ============================================================
// Prop firm guardrails
// ============================================================

/** P&L accumulated so far today (uses exit_at, local calendar day in UTC). */
export function todaysPnl(trades: TradeRow[], now = new Date()): number {
  const todayKey = now.toISOString().slice(0, 10);
  return round(
    closedTrades(trades)
      .filter((t) => (t.exit_at ?? t.entry_at).slice(0, 10) === todayKey)
      .reduce((s, t) => s + (t.pnl ?? 0), 0),
  );
}

/**
 * How close the account is to its daily loss limit and max drawdown, as a
 * 0..1 fraction. `> 1` means already breached. Used for the prop-firm alert
 * banner.
 */
export function propFirmStatus(args: {
  trades: TradeRow[];
  startingBalance: number;
  dailyLossLimit?: number | null;
  maxDrawdownLimit?: number | null;
}): {
  dailyUsedPct: number;
  drawdownUsedPct: number;
  dailyBreached: boolean;
  drawdownBreached: boolean;
} {
  const { trades, startingBalance, dailyLossLimit, maxDrawdownLimit } = args;
  const today = todaysPnl(trades);
  const dd = maxDrawdown(trades, startingBalance);
  const dailyUsedPct =
    dailyLossLimit && dailyLossLimit > 0 && today < 0
      ? round(Math.abs(today) / dailyLossLimit, 4)
      : 0;
  const drawdownUsedPct =
    maxDrawdownLimit && maxDrawdownLimit > 0
      ? round(Math.abs(dd.amount) / maxDrawdownLimit, 4)
      : 0;
  return {
    dailyUsedPct,
    drawdownUsedPct,
    dailyBreached: dailyUsedPct >= 1,
    drawdownBreached: drawdownUsedPct >= 1,
  };
}
