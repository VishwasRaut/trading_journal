import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTrade } from "@/lib/trades";
import { fetchAccounts } from "@/lib/accounts";
import { fetchPlaybooks } from "@/lib/playbooks";
import { TradeForm } from "@/components/trades/trade-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Edit trade — Ledger" };

export default async function EditTradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [trade, accounts, playbooks] = await Promise.all([
    fetchTrade(supabase, user.id, id),
    fetchAccounts(supabase, user.id),
    fetchPlaybooks(supabase, user.id, true),
  ]);
  if (!trade) notFound();

  const activeAccounts = accounts.filter((a) => !a.is_archived);
  const defaultAccountId =
    trade.account_id ??
    (activeAccounts.find((a) => a.is_default) ?? activeAccounts[0])?.id ??
    "";

  return (
    <div className="grid gap-6">
      <PageHeader title={`Edit ${trade.symbol}`} />
      <TradeForm
        userId={user.id}
        initial={trade}
        accounts={activeAccounts}
        defaultAccountId={defaultAccountId}
        playbooks={playbooks}
      />
    </div>
  );
}
