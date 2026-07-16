"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_COOKIE, ALL_ACCOUNTS } from "@/lib/accounts";
import type { AccountType } from "@/types/database";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setCurrentAccount(accountId: string) {
  const jar = await cookies();
  const value =
    accountId === ALL_ACCOUNTS || accountId === "" ? ALL_ACCOUNTS : accountId;
  jar.set(ACCOUNT_COOKIE, value, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: false,
  });
  revalidatePath("/", "layout");
}

export type SaveAccountPayload = {
  id?: string;
  name: string;
  broker?: string | null;
  account_type: AccountType;
  currency: string;
  starting_balance: number;
  color?: string | null;
  is_default?: boolean;
};

export async function saveAccount(
  payload: SaveAccountPayload,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // If this account is being set as default, unset the flag on all others.
  if (payload.is_default) {
    await supabase
      .from("trading_accounts")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .neq("id", payload.id ?? "00000000-0000-0000-0000-000000000000");
  }

  if (payload.id) {
    const { error } = await supabase
      .from("trading_accounts")
      .update({
        name: payload.name,
        broker: payload.broker ?? null,
        account_type: payload.account_type,
        currency: payload.currency,
        starting_balance: payload.starting_balance,
        color: payload.color ?? null,
        is_default: payload.is_default ?? false,
      })
      .eq("id", payload.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true, id: payload.id };
  }

  const { data, error } = await supabase
    .from("trading_accounts")
    .insert({
      user_id: user.id,
      name: payload.name,
      broker: payload.broker ?? null,
      account_type: payload.account_type,
      currency: payload.currency,
      starting_balance: payload.starting_balance,
      color: payload.color ?? null,
      is_default: payload.is_default ?? false,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

export async function archiveAccount(id: string, archived: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { error } = await supabase
    .from("trading_accounts")
    .update({ is_archived: archived })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { error } = await supabase
    .from("trading_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function setDefaultAccount(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  // Clear existing default, then set new one.
  await supabase
    .from("trading_accounts")
    .update({ is_default: false })
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("trading_accounts")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true as const };
}
