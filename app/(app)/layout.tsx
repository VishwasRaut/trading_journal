import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import {
  ensureDefaultAccount,
  fetchAccounts,
  ALL_ACCOUNTS,
  accountBalance,
} from "@/lib/accounts";
import { readCurrentAccountId } from "@/lib/accounts-server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Ensure the user has at least one trading account (auto-creates "Main"
  // on first visit and backfills orphan trades).
  await ensureDefaultAccount(
    supabase,
    user.id,
    profile?.default_currency ?? "USD",
    profile?.starting_capital ?? 0,
  );

  const [accounts, currentAccountId] = await Promise.all([
    fetchAccounts(supabase, user.id),
    readCurrentAccountId(),
  ]);

  // If cookie points to a deleted/archived account, fall back to default.
  const stillValid =
    currentAccountId === ALL_ACCOUNTS ||
    accounts.some((a) => a.id === currentAccountId && !a.is_archived);
  const resolvedAccountId = stillValid
    ? currentAccountId
    : (accounts.find((a) => a.is_default) ?? accounts[0])?.id ??
      ALL_ACCOUNTS;

  // Compute current balances for every account (needed for the switcher).
  const { data: pnls } = await supabase
    .from("trades")
    .select("account_id, pnl, status")
    .eq("user_id", user.id)
    .eq("status", "closed");

  const balances: Record<string, number> = {};
  for (const a of accounts) {
    const trades =
      (pnls ?? []).filter((p) => p.account_id === a.id) ?? [];
    balances[a.id] = accountBalance(a, trades);
  }

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email ?? "",
        displayName:
          profile?.display_name ??
          (user.email ? user.email.split("@")[0] : "Trader"),
        currency: profile?.default_currency ?? "USD",
      }}
      accounts={accounts}
      currentAccountId={resolvedAccountId}
      balances={balances}
    >
      {children}
    </AppShell>
  );
}
