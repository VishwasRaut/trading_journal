import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTrades } from "@/lib/trades";
import { fetchAccounts, ALL_ACCOUNTS } from "@/lib/accounts";
import { readCurrentAccountId } from "@/lib/accounts-server";
import { fetchPlaybooks } from "@/lib/playbooks";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Analytics — Ledger" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentAccountId = await readCurrentAccountId();
  const accountFilter =
    currentAccountId === ALL_ACCOUNTS ? undefined : currentAccountId;

  const [trades, playbooks, accounts, { data: profile }] = await Promise.all([
    fetchTrades(supabase, user.id, accountFilter),
    fetchPlaybooks(supabase, user.id, true),
    fetchAccounts(supabase, user.id),
    supabase
      .from("profiles")
      .select("default_currency, starting_capital")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  // If a specific account is selected, prefer its starting balance for
  // drawdown/calmar; otherwise fall back to the profile-wide starting capital.
  const startingCapital =
    accountFilter
      ? (accounts.find((a) => a.id === accountFilter)?.starting_balance ?? 0)
      : (profile?.starting_capital ?? 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Analytics"
        subtitle="Understand what's working and what isn't."
      />
      <AnalyticsView
        trades={trades}
        currency={profile?.default_currency ?? "USD"}
        playbooks={playbooks}
        startingCapital={startingCapital}
      />
    </div>
  );
}
