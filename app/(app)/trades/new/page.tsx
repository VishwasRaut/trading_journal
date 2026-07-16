import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAccounts, ALL_ACCOUNTS } from "@/lib/accounts";
import { readCurrentAccountId } from "@/lib/accounts-server";
import { TradeForm } from "@/components/trades/trade-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "New trade — Ledger" };

export default async function NewTradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accounts = await fetchAccounts(supabase, user.id);
  const activeAccounts = accounts.filter((a) => !a.is_archived);
  const currentAccountId = await readCurrentAccountId();
  const defaultAccountId =
    currentAccountId !== ALL_ACCOUNTS &&
    activeAccounts.some((a) => a.id === currentAccountId)
      ? currentAccountId
      : (activeAccounts.find((a) => a.is_default) ?? activeAccounts[0])?.id ??
        "";

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Log a new trade"
        subtitle="Capture the setup, entry, exit, and screenshots while it's fresh."
      />
      <TradeForm
        userId={user.id}
        accounts={activeAccounts}
        defaultAccountId={defaultAccountId}
      />
    </div>
  );
}
