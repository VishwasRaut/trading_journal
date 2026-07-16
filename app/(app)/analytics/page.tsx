import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTrades } from "@/lib/trades";
import { ALL_ACCOUNTS } from "@/lib/accounts";
import { readCurrentAccountId } from "@/lib/accounts-server";
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
  const trades = await fetchTrades(supabase, user.id, accountFilter);
  const { data: profile } = await supabase
    .from("profiles")
    .select("default_currency")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Analytics"
        subtitle="Understand what's working and what isn't."
      />
      <AnalyticsView
        trades={trades}
        currency={profile?.default_currency ?? "USD"}
      />
    </div>
  );
}
