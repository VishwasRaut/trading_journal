"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ParsedTrade } from "@/lib/mt5-parser";

export type ImportPayloadTrade = ParsedTrade;

export type ImportResult =
  | {
      ok: true;
      inserted: number;
      updated: number;
      skipped: number;
    }
  | { ok: false; error: string };

export async function importTrades(
  accountId: string,
  trades: ImportPayloadTrade[],
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Verify the account belongs to this user.
  const { data: account, error: acctErr } = await supabase
    .from("trading_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (acctErr || !account) {
    return { ok: false, error: "Account not found." };
  }

  // Check which external_ids already exist so we can differentiate insert vs update.
  const externalIds = trades.map((t) => t.externalId);
  const { data: existing } = await supabase
    .from("trades")
    .select("id, external_id")
    .eq("account_id", accountId)
    .in("external_id", externalIds);

  const existingIds = new Set(
    (existing ?? []).map((r) => r.external_id).filter(Boolean) as string[],
  );

  const rows = trades.map((t) => ({
    user_id: user.id,
    account_id: accountId,
    external_id: t.externalId,
    source: "mt5_import" as const,
    symbol: t.symbol,
    market: t.market,
    direction: t.direction,
    entry_price: t.entryPrice,
    exit_price: t.exitPrice,
    quantity: t.volume,
    lot_size: 100_000, // MT5 standard for FX; the app treats lot_size as multiplier
    entry_at: t.entryAt,
    exit_at: t.exitAt,
    stop_loss: t.stopLoss,
    take_profit: t.takeProfit,
    fees: t.fees,
    status: "closed" as const,
    pnl: t.pnl,
    pnl_percent:
      t.entryPrice > 0
        ? round(
            t.direction === "long"
              ? ((t.exitPrice - t.entryPrice) / t.entryPrice) * 100
              : ((t.entryPrice - t.exitPrice) / t.entryPrice) * 100,
          )
        : null,
    strategy: null,
    notes_entry: t.comment,
    notes_exit: null,
    mistakes: null,
  }));

  const { error } = await supabase
    .from("trades")
    .upsert(rows, {
      onConflict: "account_id,external_id",
      ignoreDuplicates: false,
    });

  if (error) return { ok: false, error: error.message };

  const updated = rows.filter((r) => existingIds.has(r.external_id)).length;
  const inserted = rows.length - updated;

  revalidatePath("/", "layout");
  return { ok: true, inserted, updated, skipped: 0 };
}

function round(n: number, d = 2) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
