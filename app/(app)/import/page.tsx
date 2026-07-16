import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAccounts, ALL_ACCOUNTS } from "@/lib/accounts";
import { readCurrentAccountId } from "@/lib/accounts-server";
import { ImportView } from "@/components/import/import-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Import — Ledger" };

export default async function ImportPage() {
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
        title="Import trades"
        subtitle="Upload a MetaTrader 5 statement (HTML or CSV) — works for XM, Vantage, IC Markets, FBS, Exness, and any MT5 broker."
      />
      <ImportView
        accounts={activeAccounts}
        defaultAccountId={defaultAccountId}
      />
    </div>
  );
}
