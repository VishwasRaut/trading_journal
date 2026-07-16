import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchTrades } from "@/lib/trades";
import { ALL_ACCOUNTS } from "@/lib/accounts";
import { readCurrentAccountId } from "@/lib/accounts-server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { TradesTable } from "@/components/trades/trades-table";

export const metadata = { title: "Trades — Ledger" };

export default async function TradesPage() {
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
        title="All trades"
        subtitle={`${trades.length} trade${trades.length === 1 ? "" : "s"} logged`}
        action={
          <div className="flex gap-2">
            <Link
              href="/import"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Upload className="mr-2 size-4" /> Import
            </Link>
            <Link href="/trades/new" className={cn(buttonVariants())}>
              <PlusCircle className="mr-2 size-4" /> New trade
            </Link>
          </div>
        }
      />
      <TradesTable
        trades={trades}
        currency={profile?.default_currency ?? "USD"}
      />
    </div>
  );
}
