"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Emotion, JournalEntryKind } from "@/types/database";

export type SaveJournalPayload = {
  kind: JournalEntryKind;
  entry_date: string; // YYYY-MM-DD
  mood?: Emotion | null;
  market_conditions?: string | null;
  what_went_well?: string | null;
  what_went_wrong?: string | null;
  lessons?: string | null;
  focus_tomorrow?: string | null;
};

export async function saveJournalEntry(
  payload: SaveJournalPayload,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Upsert by (user_id, kind, entry_date) which is unique.
  const { data, error } = await supabase
    .from("journal_entries")
    .upsert(
      {
        user_id: user.id,
        kind: payload.kind,
        entry_date: payload.entry_date,
        mood: payload.mood ?? null,
        market_conditions: payload.market_conditions ?? null,
        what_went_well: payload.what_went_well ?? null,
        what_went_wrong: payload.what_went_wrong ?? null,
        lessons: payload.lessons ?? null,
        focus_tomorrow: payload.focus_tomorrow ?? null,
      },
      { onConflict: "user_id,kind,entry_date" },
    )
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/journal");
  return { ok: true, id: data.id };
}

export async function deleteJournalEntry(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/journal");
  return { ok: true };
}
