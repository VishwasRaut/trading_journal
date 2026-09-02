import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchPlaybooks } from "@/lib/playbooks";
import { fetchTrades } from "@/lib/trades";
import { playbookPerformance } from "@/lib/analytics";
import {
  PlaybooksView,
  type PlaybookStat,
} from "@/components/playbooks/playbooks-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Playbooks — Ledger" };

export default async function PlaybooksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [playbooks, trades, { data: profile }] = await Promise.all([
    fetchPlaybooks(supabase, user.id, true),
    fetchTrades(supabase, user.id),
    supabase
      .from("profiles")
      .select("default_currency")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const stats: Record<string, PlaybookStat> = {};
  for (const s of playbookPerformance(trades)) {
    if (s.playbook_id) stats[s.playbook_id] = s;
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Playbooks"
        subtitle="Group trades by repeatable setup. Analytics shows you which one actually works."
      />
      <PlaybooksView
        playbooks={playbooks}
        stats={stats}
        currency={profile?.default_currency ?? "USD"}
      />
    </div>
  );
}
