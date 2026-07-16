import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  TradeImageRow,
  TradeRow,
  TradeTagRow,
} from "@/types/database";

export type TradeWithRelations = TradeRow & {
  trade_tags: Pick<TradeTagRow, "id" | "tag">[];
  trade_images: TradeImageRow[];
};

export async function fetchTrades(
  supabase: SupabaseClient<Database>,
  userId: string,
  accountId?: string,
): Promise<TradeWithRelations[]> {
  let q = supabase
    .from("trades")
    .select("*, trade_tags(id, tag), trade_images(*)")
    .eq("user_id", userId);
  if (accountId) q = q.eq("account_id", accountId);
  const { data, error } = await q.order("entry_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TradeWithRelations[];
}

export async function fetchTrade(
  supabase: SupabaseClient<Database>,
  userId: string,
  tradeId: string,
): Promise<TradeWithRelations | null> {
  const { data, error } = await supabase
    .from("trades")
    .select("*, trade_tags(id, tag), trade_images(*)")
    .eq("user_id", userId)
    .eq("id", tradeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as TradeWithRelations | null;
}

export async function signedImageUrl(
  supabase: SupabaseClient<Database>,
  path: string,
  expiresIn = 60 * 60,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("trade-charts")
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}
