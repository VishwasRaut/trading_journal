import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTrades } from "@/lib/trades";
import { ALL_ACCOUNTS } from "@/lib/accounts";
import { readCurrentAccountId } from "@/lib/accounts-server";
import { CalendarView } from "@/components/calendar/calendar-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Calendar — Ledger" };

export default async function CalendarPage() {
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
        title="Trading calendar"
        subtitle="Every green day is a lesson. Every red day is a lesson."
      />
      <CalendarView
        trades={trades}
        currency={profile?.default_currency ?? "USD"}
      />
    </div>
  );
}
