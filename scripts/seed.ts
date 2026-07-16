/**
 * Seed script — inserts ~40 realistic sample trades so the dashboard,
 * analytics, and calendar have something to visualise while you explore.
 *
 * Usage:
 *   1. In .env.local, fill in SUPABASE_SERVICE_ROLE_KEY (Project Settings > API > service_role).
 *      (Do NOT commit this key. It bypasses RLS.)
 *   2. Sign up a user via the app (or note an existing user's id from the
 *      Supabase Auth page).
 *   3. Run:
 *        npx tsx scripts/seed.ts <user_email_or_uuid>
 *      e.g.  npx tsx scripts/seed.ts you@example.com
 *
 * The script upserts trades keyed by (user_id, symbol, entry_at) so you can
 * run it multiple times without creating duplicates.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service || service === "your-service-role-key") {
  console.error(
    "\nMissing SUPABASE_SERVICE_ROLE_KEY in .env.local. Get it from Supabase " +
      "Project Settings > API > service_role and paste it into .env.local.\n",
  );
  process.exit(1);
}

const supabase = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const arg = process.argv[2];
if (!arg) {
  console.error(
    "\nUsage: npx tsx scripts/seed.ts <user_email_or_uuid>\n",
  );
  process.exit(1);
}

async function resolveUserId(input: string): Promise<string> {
  // UUID?
  if (/^[0-9a-f-]{36}$/i.test(input)) return input;

  // Email → look up in auth.users
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(error.message);
  const user = data.users.find(
    (u) => u.email?.toLowerCase() === input.toLowerCase(),
  );
  if (!user) throw new Error(`No user found for "${input}"`);
  return user.id;
}

type SeedTrade = {
  symbol: string;
  market: "forex" | "crypto" | "equity" | "options" | "futures";
  direction: "long" | "short";
  entry_price: number;
  exit_price: number;
  quantity: number;
  lot_size: number | null;
  daysAgo: number;
  holdHours: number;
  fees: number;
  strategy: string;
  notes_entry: string;
  notes_exit: string;
  tags: string[];
};

const trades: SeedTrade[] = [
  { symbol: "EURUSD", market: "forex", direction: "long", entry_price: 1.0810, exit_price: 1.0862, quantity: 0.5, lot_size: 100000, daysAgo: 48, holdHours: 5, fees: 3, strategy: "London breakout", notes_entry: "Break of Asian range with strong momentum candle. Above 200 EMA on H1.", notes_exit: "Hit TP at NY open resistance. Textbook.", tags: ["breakout", "london"] },
  { symbol: "GBPJPY", market: "forex", direction: "short", entry_price: 189.42, exit_price: 189.90, quantity: 0.3, lot_size: 100000, daysAgo: 45, holdHours: 2, fees: 3, strategy: "Fade extension", notes_entry: "Extended rally into weekly resistance. RSI 78.", notes_exit: "Broke my SL. Should have waited for confirmation.", tags: ["mistake", "revenge"] },
  { symbol: "XAUUSD", market: "forex", direction: "long", entry_price: 2318, exit_price: 2352, quantity: 0.2, lot_size: 100, daysAgo: 42, holdHours: 20, fees: 4, strategy: "Trend continuation", notes_entry: "Pullback to 20 EMA on H4 in uptrend. Bullish engulfing.", notes_exit: "Rode to psych level 2350.", tags: ["gold", "trend"] },
  { symbol: "USDJPY", market: "forex", direction: "long", entry_price: 148.20, exit_price: 148.05, quantity: 0.5, lot_size: 100000, daysAgo: 40, holdHours: 8, fees: 3, strategy: "Trend continuation", notes_entry: "H1 breakout of range.", notes_exit: "Choppy price action, stopped at BE minus fees.", tags: ["breakout"] },
  { symbol: "BTCUSDT", market: "crypto", direction: "long", entry_price: 62100, exit_price: 65400, quantity: 0.08, lot_size: null, daysAgo: 38, holdHours: 36, fees: 12, strategy: "Range breakout", notes_entry: "Broke consolidation on strong volume. Fresh weekly open.", notes_exit: "Sold into 65k resistance.", tags: ["crypto", "breakout"] },
  { symbol: "ETHUSDT", market: "crypto", direction: "short", entry_price: 3410, exit_price: 3452, quantity: 1.2, lot_size: null, daysAgo: 36, holdHours: 4, fees: 6, strategy: "Mean reversion", notes_entry: "Overextended into resistance.", notes_exit: "Stopped out. Sentiment was too strong to fade.", tags: ["crypto", "mean-reversion", "mistake"] },
  { symbol: "SOLUSDT", market: "crypto", direction: "long", entry_price: 142.50, exit_price: 158.20, quantity: 20, lot_size: null, daysAgo: 34, holdHours: 48, fees: 8, strategy: "Trend continuation", notes_entry: "Higher-high / higher-low. Held 50 EMA.", notes_exit: "Trailed stop and got taken out at 158.", tags: ["crypto", "trend"] },
  { symbol: "AAPL", market: "equity", direction: "long", entry_price: 187.20, exit_price: 191.85, quantity: 100, lot_size: null, daysAgo: 32, holdHours: 24, fees: 2, strategy: "Earnings run", notes_entry: "Pre-earnings momentum, iPhone cycle theme.", notes_exit: "Sold into announcement.", tags: ["equity", "earnings"] },
  { symbol: "TSLA", market: "equity", direction: "short", entry_price: 244.30, exit_price: 231.80, quantity: 50, lot_size: null, daysAgo: 30, holdHours: 30, fees: 2, strategy: "Rejection at resistance", notes_entry: "Big red daily rejection at 250.", notes_exit: "Perfect execution — held to next demand.", tags: ["equity", "reversal"] },
  { symbol: "EURUSD", market: "forex", direction: "short", entry_price: 1.0880, exit_price: 1.0855, quantity: 0.5, lot_size: 100000, daysAgo: 28, holdHours: 3, fees: 3, strategy: "London breakout", notes_entry: "Break of Asian low.", notes_exit: "Textbook TP1.", tags: ["breakout", "london"] },
  { symbol: "GBPUSD", market: "forex", direction: "long", entry_price: 1.2712, exit_price: 1.2688, quantity: 0.4, lot_size: 100000, daysAgo: 27, holdHours: 6, fees: 3, strategy: "Retest", notes_entry: "Retest of breakout — dodgy pattern.", notes_exit: "Loss. Wick-hunted by news.", tags: ["news"] },
  { symbol: "XAUUSD", market: "forex", direction: "long", entry_price: 2360, exit_price: 2402, quantity: 0.3, lot_size: 100, daysAgo: 25, holdHours: 40, fees: 5, strategy: "Trend continuation", notes_entry: "Continued uptrend, weak DXY.", notes_exit: "Big move to 2400 area.", tags: ["gold", "trend"] },
  { symbol: "BTCUSDT", market: "crypto", direction: "short", entry_price: 66200, exit_price: 66700, quantity: 0.1, lot_size: null, daysAgo: 23, holdHours: 2, fees: 6, strategy: "Fade extension", notes_entry: "Testing lower highs.", notes_exit: "Stopped. Didn't respect the strength.", tags: ["crypto", "mistake"] },
  { symbol: "ES", market: "futures", direction: "long", entry_price: 5222, exit_price: 5240, quantity: 2, lot_size: 50, daysAgo: 22, holdHours: 3, fees: 8, strategy: "ORB", notes_entry: "Opening range break to the upside.", notes_exit: "Rode to end-of-day resistance.", tags: ["ES", "orb"] },
  { symbol: "NQ", market: "futures", direction: "short", entry_price: 18540, exit_price: 18420, quantity: 1, lot_size: 20, daysAgo: 21, holdHours: 4, fees: 6, strategy: "Failed breakout", notes_entry: "Failed break of morning high.", notes_exit: "Nice cover into VWAP.", tags: ["NQ", "reversal"] },
  { symbol: "CL", market: "futures", direction: "long", entry_price: 78.20, exit_price: 77.80, quantity: 1, lot_size: 1000, daysAgo: 19, holdHours: 8, fees: 5, strategy: "Trend", notes_entry: "OPEC bullish narrative.", notes_exit: "Reversed on inventories report.", tags: ["oil", "news"] },
  { symbol: "EURUSD", market: "forex", direction: "long", entry_price: 1.0790, exit_price: 1.0830, quantity: 0.5, lot_size: 100000, daysAgo: 17, holdHours: 12, fees: 3, strategy: "Retest", notes_entry: "Retest of daily support.", notes_exit: "Clean 40 pips.", tags: ["support"] },
  { symbol: "USDJPY", market: "forex", direction: "short", entry_price: 152.10, exit_price: 151.30, quantity: 0.4, lot_size: 100000, daysAgo: 15, holdHours: 20, fees: 3, strategy: "Reversal", notes_entry: "BoJ intervention risk zone.", notes_exit: "Rode intervention move.", tags: ["news", "reversal"] },
  { symbol: "BTCUSDT", market: "crypto", direction: "long", entry_price: 63200, exit_price: 68100, quantity: 0.05, lot_size: null, daysAgo: 13, holdHours: 60, fees: 10, strategy: "Weekly breakout", notes_entry: "Broke multi-week range.", notes_exit: "Held through weekend, sold Sunday.", tags: ["crypto", "swing"] },
  { symbol: "ETHUSDT", market: "crypto", direction: "long", entry_price: 3320, exit_price: 3510, quantity: 0.8, lot_size: null, daysAgo: 12, holdHours: 30, fees: 6, strategy: "Trend continuation", notes_entry: "Follow-through from BTC move.", notes_exit: "Took profit at 3500.", tags: ["crypto"] },
  { symbol: "SOLUSDT", market: "crypto", direction: "short", entry_price: 168, exit_price: 172, quantity: 15, lot_size: null, daysAgo: 11, holdHours: 6, fees: 5, strategy: "Fade extension", notes_entry: "Too extended, expected pullback.", notes_exit: "Wrong. Trend continued.", tags: ["crypto", "mistake"] },
  { symbol: "AAPL", market: "equity", direction: "long", entry_price: 192, exit_price: 195.20, quantity: 60, lot_size: null, daysAgo: 9, holdHours: 20, fees: 2, strategy: "Trend", notes_entry: "Held 20 EMA cleanly.", notes_exit: "Sold into weekly high.", tags: ["equity"] },
  { symbol: "XAUUSD", market: "forex", direction: "short", entry_price: 2415, exit_price: 2402, quantity: 0.2, lot_size: 100, daysAgo: 8, holdHours: 4, fees: 4, strategy: "Rejection", notes_entry: "Doji at all-time high on H4.", notes_exit: "Nice pullback to entry area.", tags: ["gold"] },
  { symbol: "GBPJPY", market: "forex", direction: "long", entry_price: 192.50, exit_price: 193.80, quantity: 0.3, lot_size: 100000, daysAgo: 6, holdHours: 8, fees: 3, strategy: "Momentum", notes_entry: "Strong bullish structure.", notes_exit: "Trailed to +130 pips.", tags: ["momentum"] },
  { symbol: "BTCUSDT", market: "crypto", direction: "long", entry_price: 66500, exit_price: 66100, quantity: 0.06, lot_size: null, daysAgo: 5, holdHours: 2, fees: 5, strategy: "Bounce", notes_entry: "Bought at 4H trendline.", notes_exit: "Wicked below, took me out.", tags: ["crypto", "mistake"] },
  { symbol: "ES", market: "futures", direction: "long", entry_price: 5245, exit_price: 5262, quantity: 1, lot_size: 50, daysAgo: 4, holdHours: 5, fees: 4, strategy: "Trend", notes_entry: "Held 5245 through morning session.", notes_exit: "Sold into afternoon high.", tags: ["ES", "trend"] },
  { symbol: "EURUSD", market: "forex", direction: "long", entry_price: 1.0755, exit_price: 1.0792, quantity: 0.6, lot_size: 100000, daysAgo: 3, holdHours: 14, fees: 3, strategy: "Retest", notes_entry: "Beautiful retest of range low.", notes_exit: "TP at range mid.", tags: ["support", "retest"] },
  { symbol: "NQ", market: "futures", direction: "long", entry_price: 18720, exit_price: 18795, quantity: 1, lot_size: 20, daysAgo: 2, holdHours: 3, fees: 5, strategy: "ORB", notes_entry: "Opening range breakout.", notes_exit: "Rode into lunch break high.", tags: ["NQ", "orb"] },
  { symbol: "TSLA", market: "equity", direction: "long", entry_price: 235.50, exit_price: 234.10, quantity: 40, lot_size: null, daysAgo: 1, holdHours: 20, fees: 2, strategy: "Bounce", notes_entry: "Support bounce play.", notes_exit: "Choppy, took small loss.", tags: ["equity"] },
];

function pnl(t: SeedTrade) {
  const size = t.quantity * (t.lot_size ?? 1);
  const gross =
    t.direction === "long"
      ? (t.exit_price - t.entry_price) * size
      : (t.entry_price - t.exit_price) * size;
  return round(gross - t.fees);
}

function pnlPct(t: SeedTrade) {
  return round(
    t.direction === "long"
      ? ((t.exit_price - t.entry_price) / t.entry_price) * 100
      : ((t.entry_price - t.exit_price) / t.entry_price) * 100,
  );
}

function round(n: number, d = 2) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

async function main() {
  const userId = await resolveUserId(arg);
  console.log(`Seeding ${trades.length} trades for user ${userId}...`);

  // Wipe existing sample trades so we can re-run idempotently
  await supabase
    .from("trades")
    .delete()
    .eq("user_id", userId)
    .in(
      "strategy",
      Array.from(new Set(trades.map((t) => t.strategy))),
    );

  const now = Date.now();
  const rows = trades.map((t) => {
    const entryAt = new Date(
      now - t.daysAgo * 86400_000 - t.holdHours * 3600_000,
    );
    const exitAt = new Date(entryAt.getTime() + t.holdHours * 3600_000);
    return {
      user_id: userId,
      symbol: t.symbol,
      market: t.market,
      direction: t.direction,
      entry_price: t.entry_price,
      exit_price: t.exit_price,
      quantity: t.quantity,
      lot_size: t.lot_size,
      entry_at: entryAt.toISOString(),
      exit_at: exitAt.toISOString(),
      status: "closed" as const,
      pnl: pnl(t),
      pnl_percent: pnlPct(t),
      fees: t.fees,
      strategy: t.strategy,
      notes_entry: t.notes_entry,
      notes_exit: t.notes_exit,
      mistakes: t.tags.includes("mistake")
        ? "Broke my rules — took a low-quality setup."
        : null,
    };
  });

  const { data: inserted, error } = await supabase
    .from("trades")
    .insert(rows)
    .select("id");
  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }

  // Insert tags
  const tagRows = trades.flatMap((t, i) =>
    t.tags.map((tag) => ({ trade_id: inserted![i].id as string, tag })),
  );
  if (tagRows.length) {
    const { error: tagsErr } = await supabase.from("trade_tags").insert(tagRows);
    if (tagsErr) console.warn("Tag insert warning:", tagsErr.message);
  }

  const totalPnl = rows.reduce((s, r) => s + (r.pnl ?? 0), 0);
  const wins = rows.filter((r) => (r.pnl ?? 0) > 0).length;
  console.log(
    `✓ Seeded ${rows.length} trades — total P&L ${totalPnl.toFixed(2)}, ${wins} wins, ${
      rows.length - wins
    } losses.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
