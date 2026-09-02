import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PlaybookRow } from "@/types/database";

export async function fetchPlaybooks(
  supabase: SupabaseClient<Database>,
  userId: string,
  includeArchived = false,
): Promise<PlaybookRow[]> {
  let q = supabase.from("playbooks").select("*").eq("user_id", userId);
  if (!includeArchived) q = q.eq("is_archived", false);
  const { data, error } = await q.order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlaybookRow[];
}

export async function fetchPlaybook(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
): Promise<PlaybookRow | null> {
  const { data, error } = await supabase
    .from("playbooks")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as PlaybookRow | null;
}
