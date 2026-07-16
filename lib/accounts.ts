import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TradingAccountRow, TradeRow } from "@/types/database";

export const ACCOUNT_COOKIE = "ledger_account";
/** Sentinel value stored in the cookie to mean "no filter, show all". */
export const ALL_ACCOUNTS = "all";

export async function fetchAccounts(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TradingAccountRow[]> {
  const { data, error } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("is_archived", { ascending: true })
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TradingAccountRow[];
}

/**
 * Ensures the user has at least one account. Creates a "Main" account on
 * first visit and back-fills any trades that don't have account_id yet.
 */
export async function ensureDefaultAccount(
  supabase: SupabaseClient<Database>,
  userId: string,
  defaultCurrency = "USD",
  startingBalance = 0,
): Promise<TradingAccountRow> {
  const accounts = await fetchAccounts(supabase, userId);
  const existing = accounts.find((a) => a.is_default) ?? accounts[0];
  if (existing) return existing;

  const { data, error } = await supabase
    .from("trading_accounts")
    .insert({
      user_id: userId,
      name: "Main",
      account_type: "live",
      currency: defaultCurrency,
      starting_balance: startingBalance,
      is_default: true,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Backfill any orphan trades to this account.
  await supabase
    .from("trades")
    .update({ account_id: data.id })
    .eq("user_id", userId)
    .is("account_id", null);

  return data as TradingAccountRow;
}

export function accountBalance(
  account: Pick<TradingAccountRow, "starting_balance">,
  trades: Pick<TradeRow, "status" | "pnl">[],
): number {
  const pnl = trades.reduce(
    (s, t) => s + (t.status === "closed" ? t.pnl ?? 0 : 0),
    0,
  );
  return round(account.starting_balance + pnl);
}

function round(n: number, d = 2) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
