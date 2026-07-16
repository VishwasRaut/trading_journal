import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTrade } from "@/lib/trades";
import { fetchAccounts } from "@/lib/accounts";
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

  const [trade, accounts] = await Promise.all([
    fetchTrade(supabase, user.id, id),
    fetchAccounts(supabase, user.id),
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
      />
    </div>
  );
}
