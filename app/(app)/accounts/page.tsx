import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAccounts, accountBalance } from "@/lib/accounts";
import { AccountsView } from "@/components/accounts/accounts-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Accounts — Ledger" };

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accounts = await fetchAccounts(supabase, user.id);

  const { data: pnls } = await supabase
    .from("trades")
    .select("account_id, pnl, status")
    .eq("user_id", user.id);

  const stats: Record<
    string,
    { balance: number; totalTrades: number; openTrades: number; totalPnl: number }
  > = {};
  for (const a of accounts) {
    const trades = (pnls ?? []).filter((p) => p.account_id === a.id);
    const closed = trades.filter((t) => t.status === "closed");
    const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    stats[a.id] = {
      balance: accountBalance(a, closed),
      totalPnl,
      totalTrades: trades.length,
      openTrades: trades.filter((t) => t.status === "open").length,
    };
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Trading accounts"
        subtitle="Track each broker or exchange account separately."
      />
      <AccountsView accounts={accounts} stats={stats} />
    </div>
  );
}
