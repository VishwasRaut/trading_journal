import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTrades } from "@/lib/trades";
import { dailyPnlMap } from "@/lib/analytics";
import { JournalView } from "@/components/journal/journal-view";
import { PageHeader } from "@/components/layout/page-header";
import type { JournalEntryRow } from "@/types/database";

export const metadata = { title: "Journal — Ledger" };

export default async function JournalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: entries }, trades, { data: profile }] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false })
      .limit(60),
    fetchTrades(supabase, user.id),
    supabase
      .from("profiles")
      .select("default_currency")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const dailyPnl = dailyPnlMap(trades);
  const dailyPnlByDate: Record<string, { pnl: number; count: number }> = {};
  for (const d of dailyPnl) {
    dailyPnlByDate[d.day] = { pnl: d.value, count: d.count };
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Journal"
        subtitle="Daily reflection and weekly review — the habit that separates pros from amateurs."
      />
      <JournalView
        entries={(entries ?? []) as JournalEntryRow[]}
        dailyPnlByDate={dailyPnlByDate}
        currency={profile?.default_currency ?? "USD"}
      />
    </div>
  );
}
