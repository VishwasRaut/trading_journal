"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PlaybookChecklistItem } from "@/types/database";

export type SavePlaybookPayload = {
  id?: string;
  name: string;
  description?: string | null;
  color?: string | null;
  target_r_multiple?: number | null;
  checklist: PlaybookChecklistItem[];
};

type ActionOk = { ok: true };
type ActionErr = { ok: false; error: string };

export async function savePlaybook(
  payload: SavePlaybookPayload,
): Promise<({ ok: true; id: string }) | ActionErr> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const row = {
    name: payload.name,
    description: payload.description ?? null,
    color: payload.color ?? null,
    target_r_multiple: payload.target_r_multiple ?? null,
    checklist: payload.checklist,
  };

  if (payload.id) {
    const { error } = await supabase
      .from("playbooks")
      .update(row)
      .eq("id", payload.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/playbooks");
    revalidatePath("/analytics");
    return { ok: true, id: payload.id };
  }

  const { data, error } = await supabase
    .from("playbooks")
    .insert({ ...row, user_id: user.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/playbooks");
  revalidatePath("/analytics");
  return { ok: true, id: data.id };
}

export async function archivePlaybook(
  id: string,
  archived: boolean,
): Promise<ActionOk | ActionErr> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase
    .from("playbooks")
    .update({ is_archived: archived })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/playbooks");
  return { ok: true };
}

export async function deletePlaybook(id: string): Promise<ActionOk | ActionErr> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase
    .from("playbooks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/playbooks");
  revalidatePath("/analytics");
  return { ok: true };
}
