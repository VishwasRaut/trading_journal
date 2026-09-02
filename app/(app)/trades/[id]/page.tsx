import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  TrendingDown,
  TrendingUp,
  Target,
  ListChecks,
  Check,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchTrade, signedImageUrl } from "@/lib/trades";
import { fetchPlaybook } from "@/lib/playbooks";
import { rMultiple } from "@/lib/analytics";
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

  const [{ data: profile }, playbook, imagesWithUrl] = await Promise.all([
    supabase
      .from("profiles")
      .select("default_currency")
      .eq("id", user.id)
      .maybeSingle(),
    trade.playbook_id
      ? fetchPlaybook(supabase, user.id, trade.playbook_id)
      : Promise.resolve(null),
    Promise.all(
      trade.trade_images.map(async (img) => ({
        ...img,
        url: await signedImageUrl(supabase, img.storage_path),
      })),
    ),
  ]);
  const currency = profile?.default_currency ?? "USD";
  const r = rMultiple(trade);
  const checklistDone = trade.checklist_completed ?? [];
  const checklistTotal = playbook?.checklist.length ?? 0;
  const plannedRR =
    trade.planned_entry &&
    trade.planned_stop &&
    trade.planned_target &&
    Math.abs(trade.planned_entry - trade.planned_stop) > 0
      ? Math.abs(trade.planned_target - trade.planned_entry) /
        Math.abs(trade.planned_entry - trade.planned_stop)
      : null;

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

      {(r !== null ||
        trade.thesis ||
        trade.planned_entry ||
        playbook ||
        trade.execution_grade) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4 text-primary" /> Plan & execution
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <MiniStat
                label="R multiple"
                value={
                  r === null
                    ? "—"
                    : `${r > 0 ? "+" : ""}${r.toFixed(2)}R`
                }
                tone={
                  r === null || r === 0
                    ? "muted"
                    : r > 0
                      ? "profit"
                      : "loss"
                }
              />
              <MiniStat
                label="Initial risk"
                value={
                  trade.initial_risk
                    ? formatSigned(-trade.initial_risk, currency)
                    : "—"
                }
                tone="muted"
              />
              <MiniStat
                label="Planned R:R"
                value={plannedRR ? plannedRR.toFixed(2) : "—"}
                tone="muted"
              />
              <MiniStat
                label="Grade"
                value={trade.execution_grade ?? "—"}
                tone={
                  trade.execution_grade === "A" ||
                  trade.execution_grade === "B"
                    ? "profit"
                    : trade.execution_grade === "F"
                      ? "loss"
                      : "muted"
                }
              />
            </div>

            {playbook && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Playbook:</span>
                <span
                  className="inline-block size-2.5 rounded-sm"
                  style={{ background: playbook.color ?? "var(--primary)" }}
                />
                <span className="font-medium">{playbook.name}</span>
                {playbook.target_r_multiple && (
                  <span className="text-xs text-muted-foreground">
                    · target {playbook.target_r_multiple}R
                  </span>
                )}
              </div>
            )}

            {trade.thesis && (
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Thesis
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {trade.thesis}
                </p>
              </div>
            )}

            {(trade.planned_entry ||
              trade.planned_stop ||
              trade.planned_target) && (
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Plan vs actual
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <PlanRow
                    label="Entry"
                    planned={trade.planned_entry}
                    actual={trade.entry_price}
                  />
                  <PlanRow
                    label="Stop"
                    planned={trade.planned_stop}
                    actual={trade.stop_loss}
                  />
                  <PlanRow
                    label="Target"
                    planned={trade.planned_target}
                    actual={trade.exit_price}
                  />
                </div>
              </div>
            )}

            {playbook && checklistTotal > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <ListChecks className="size-4 text-primary" />
                  <span className="text-sm font-medium">
                    Rule adherence — {checklistDone.length}/{checklistTotal}
                  </span>
                </div>
                <div className="grid gap-1">
                  {playbook.checklist.map((item) => {
                    const done = checklistDone.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${
                          done
                            ? "border-profit/30 bg-profit/5"
                            : "border-loss/30 bg-loss/5 text-muted-foreground line-through"
                        }`}
                      >
                        {done ? (
                          <Check className="size-3.5 text-profit" />
                        ) : (
                          <X className="size-3.5 text-loss" />
                        )}
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

function MiniStat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "muted";
}) {
  const cls =
    tone === "profit"
      ? "text-profit"
      : tone === "loss"
        ? "text-loss"
        : "text-foreground";
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className={`num mt-1 text-lg font-semibold tracking-tight ${cls}`}>
        {value}
      </div>
    </div>
  );
}

function PlanRow({
  label,
  planned,
  actual,
}: {
  label: string;
  planned: number | null;
  actual: number | null;
}) {
  const diff =
    planned !== null && actual !== null ? actual - planned : null;
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2 text-sm">
        <span className="num text-muted-foreground">
          plan {planned ?? "—"}
        </span>
        <span className="num font-semibold">→ {actual ?? "—"}</span>
      </div>
      {diff !== null && diff !== 0 && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {diff > 0 ? "+" : ""}
          {diff.toFixed(5)} slip
        </div>
      )}
    </div>
  );
}
