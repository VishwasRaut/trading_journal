import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchTrade, signedImageUrl } from "@/lib/trades";
import { formatSigned, formatPercent, formatTradeDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TradeCharts } from "@/components/trades/trade-charts";

export const metadata = { title: "Trade — Ledger" };

export default async function TradePage({
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

  const trade = await fetchTrade(supabase, user.id, id);
  if (!trade) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_currency")
    .eq("id", user.id)
    .maybeSingle();
  const currency = profile?.default_currency ?? "USD";

  const imagesWithUrl = await Promise.all(
    trade.trade_images.map(async (img) => ({
      ...img,
      url: await signedImageUrl(supabase, img.storage_path),
    })),
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/trades"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            <ArrowLeft className="mr-1 size-4" /> Trades
          </Link>
          <h1 className="font-display text-3xl leading-none tracking-tight md:text-4xl">
            {trade.symbol}
          </h1>
          <Badge variant="secondary" className="uppercase">
            {trade.market}
          </Badge>
          <Badge
            className={`gap-1 ${
              trade.direction === "long"
                ? "bg-profit/15 text-profit hover:bg-profit/20"
                : "bg-loss/15 text-loss hover:bg-loss/20"
            }`}
          >
            {trade.direction === "long" ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {trade.direction}
          </Badge>
        </div>
        <Link
          href={`/trades/${trade.id}/edit`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Edit className="mr-2 size-4" /> Edit
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="P&L" strong>
          {trade.pnl !== null ? (
            <span
              className={`num text-2xl font-semibold tracking-tight ${
                trade.pnl >= 0 ? "text-profit" : "text-loss"
              }`}
            >
              {formatSigned(trade.pnl, currency)}
            </span>
          ) : (
            <span className="text-lg text-muted-foreground">Open</span>
          )}
          {trade.pnl_percent !== null && (
            <div
              className={`num text-sm ${
                trade.pnl_percent >= 0 ? "text-profit" : "text-loss"
              }`}
            >
              {formatPercent(trade.pnl_percent)}
            </div>
          )}
        </SummaryCard>
        <SummaryCard label="Entry">
          <div className="num text-lg font-semibold tracking-tight">
            {trade.entry_price}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatTradeDate(trade.entry_at)}
          </div>
        </SummaryCard>
        <SummaryCard label="Exit">
          <div className="num text-lg font-semibold tracking-tight">
            {trade.exit_price ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground">
            {trade.exit_at ? formatTradeDate(trade.exit_at) : "Still open"}
          </div>
        </SummaryCard>
        <SummaryCard label="Size">
          <div className="num text-lg font-semibold tracking-tight">
            {trade.quantity}
          </div>
          <div className="text-xs text-muted-foreground">
            {trade.lot_size ? `Contract: ${trade.lot_size.toLocaleString()}` : "—"}
          </div>
        </SummaryCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Why I took this trade</CardTitle>
          </CardHeader>
          <CardContent>
            {trade.notes_entry ? (
              <p className="whitespace-pre-wrap text-sm">{trade.notes_entry}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No entry notes.
              </p>
            )}
            {trade.strategy && (
              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Strategy:</span>
                <Badge variant="outline">{trade.strategy}</Badge>
              </div>
            )}
            {trade.trade_tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {trade.trade_tags.map((t) => (
                  <Badge key={t.id} variant="secondary">
                    {t.tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>What happened</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {trade.notes_exit ? (
              <p className="whitespace-pre-wrap text-sm">{trade.notes_exit}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No exit notes yet.
              </p>
            )}
            {trade.mistakes && (
              <div className="rounded-lg border border-loss/40 bg-loss/5 p-3">
                <div className="text-xs font-medium uppercase tracking-wider text-loss">
                  Mistakes / lessons
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {trade.mistakes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TradeCharts images={imagesWithUrl} />
    </div>
  );
}

function SummaryCard({
  label,
  strong,
  children,
}: {
  label: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={strong ? "border-primary/40" : ""}>
      <CardContent className="grid gap-1.5 py-5">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}
