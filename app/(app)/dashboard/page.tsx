import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Percent,
  Scale,
  Target,
  Wallet,
  Activity,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchTrades } from "@/lib/trades";
import { fetchAccounts, ALL_ACCOUNTS } from "@/lib/accounts";
import { readCurrentAccountId } from "@/lib/accounts-server";
import {
  totalPnl,
  winRate,
  avgRiskReward,
  equityCurveRich,
  groupTradesByMonth,
  closedTrades,
  profitFactor,
  expectancyR,
  sharpeRatio,
  currentStreak,
  todaysPnl,
  propFirmStatus,
} from "@/lib/analytics";
import { formatSigned, formatPercent, formatTradeDate } from "@/lib/format";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TraderQuotes } from "@/components/dashboard/trader-quotes";
import { EquityCurvePro } from "@/components/charts/equity-curve-pro";
import { PageHeader } from "@/components/layout/page-header";
import { PropFirmBanner } from "@/components/dashboard/prop-firm-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard — Ledger" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, currentAccountId, accounts] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    readCurrentAccountId(),
    fetchAccounts(supabase, user.id),
  ]);
  const activeAccount = accounts.find((a) => a.id === currentAccountId);
  const currency =
    activeAccount?.currency ?? profile?.default_currency ?? "USD";
  const startingCapital =
    activeAccount?.starting_balance ?? profile?.starting_capital ?? 0;
  const accountFilter =
    currentAccountId === ALL_ACCOUNTS ? undefined : currentAccountId;

  const trades = await fetchTrades(supabase, user.id, accountFilter);
  const closed = closedTrades(trades);
  const total = totalPnl(trades);
  const win = winRate(trades);
  const rr = avgRiskReward(trades);
  const pf = profitFactor(trades);
  const expR = expectancyR(trades);
  const sharpe = sharpeRatio(trades);
  const streak = currentStreak(trades);
  const monthly = groupTradesByMonth(trades);
  const thisMonth = monthly.at(-1);
  const today = todaysPnl(trades);
  const equity = equityCurveRich(trades, startingCapital);

  const propStatus = activeAccount
    ? propFirmStatus({
        trades,
        startingBalance: activeAccount.starting_balance,
        dailyLossLimit: activeAccount.daily_loss_limit,
        maxDrawdownLimit: activeAccount.max_drawdown_limit,
      })
    : null;

  const recent = trades.slice(0, 5);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Welcome back${profile?.display_name ? `, ${profile.display_name}` : ""}`}
        subtitle={
          closed.length === 0
            ? "Log your first closed trade to unlock analytics."
            : `${closed.length} closed trade${closed.length === 1 ? "" : "s"} tracked.`
        }
      />

      <TraderQuotes />

      {propStatus &&
        (propStatus.dailyUsedPct > 0 || propStatus.drawdownUsedPct > 0) && (
          <PropFirmBanner
            dailyUsedPct={propStatus.dailyUsedPct}
            drawdownUsedPct={propStatus.drawdownUsedPct}
            dailyBreached={propStatus.dailyBreached}
            drawdownBreached={propStatus.drawdownBreached}
            todayPnl={today}
            currency={currency}
          />
        )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total P&L"
          value={total}
          format={{ kind: "signed", currency }}
          tone={total >= 0 ? "profit" : "loss"}
          icon={<Wallet className="size-5" />}
          hint={`across ${closed.length} trades`}
        />
        <KpiCard
          label="Win rate"
          value={win}
          format={{ kind: "percent", digits: 1 }}
          tone="primary"
          icon={<Target className="size-5" />}
          hint={
            closed.length
              ? `${closed.filter((t) => (t.pnl ?? 0) > 0).length}W · ${
                  closed.filter((t) => (t.pnl ?? 0) < 0).length
                }L`
              : "—"
          }
        />
        <KpiCard
          label="Avg R:R"
          value={rr}
          format={{ kind: "number", digits: 2 }}
          tone="primary"
          icon={<Scale className="size-5" />}
          hint="avg win / avg loss"
        />
        <KpiCard
          label="This month"
          value={thisMonth?.pnl ?? 0}
          format={{ kind: "signed", currency }}
          tone={(thisMonth?.pnl ?? 0) >= 0 ? "profit" : "loss"}
          icon={<Percent className="size-5" />}
          hint={thisMonth?.label ?? "no trades this month"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Expectancy (R)"
          value={expR}
          format={{ kind: "number", digits: 2 }}
          tone={expR > 0 ? "profit" : expR < 0 ? "loss" : "primary"}
          icon={<Target className="size-5" />}
          hint="per trade in R units"
        />
        <KpiCard
          label="Profit factor"
          value={pf === Infinity ? 99 : pf}
          format={{ kind: "number", digits: 2 }}
          tone={pf >= 1.5 ? "profit" : pf < 1 ? "loss" : "primary"}
          icon={<TrendingUp className="size-5" />}
          hint=">1.5 is a healthy edge"
        />
        <KpiCard
          label="Sharpe"
          value={sharpe}
          format={{ kind: "number", digits: 2 }}
          tone={sharpe > 1 ? "profit" : sharpe < 0 ? "loss" : "primary"}
          icon={<Activity className="size-5" />}
          hint="risk-adjusted return"
        />
        <KpiCard
          label={streak >= 0 ? "Winning streak" : "Losing streak"}
          value={Math.abs(streak)}
          format={{ kind: "number", digits: 0 }}
          tone={streak >= 0 ? "profit" : "loss"}
          icon={<Activity className="size-5" />}
          hint="trades in a row"
        />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-5 md:p-6">
          <EquityCurvePro
            data={equity}
            startingCapital={startingCapital}
            currency={currency}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent trades</CardTitle>
          <Link
            href="/trades"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            View all <ArrowRight className="ml-1 size-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="grid place-items-center py-8 text-center">
              <div className="text-muted-foreground text-sm">
                No trades yet.
              </div>
              <Link
                href="/trades/new"
                className={cn(buttonVariants(), "mt-4")}
              >
                Log your first trade
              </Link>
            </div>
          ) : (
            <div className="grid gap-2">
              {recent.map((t) => (
                <Link
                  key={t.id}
                  href={`/trades/${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-2 rounded-full ${
                        t.status === "open"
                          ? "bg-primary"
                          : (t.pnl ?? 0) >= 0
                            ? "bg-profit"
                            : "bg-loss"
                      }`}
                    />
                    <div>
                      <div className="font-medium">{t.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTradeDate(t.entry_at)} · {t.direction}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="uppercase text-[10px]">
                      {t.market}
                    </Badge>
                    {t.pnl !== null ? (
                      <span
                        className={`font-medium ${
                          t.pnl >= 0 ? "text-profit" : "text-loss"
                        }`}
                      >
                        {formatSigned(t.pnl, currency)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Open
                      </span>
                    )}
                    {t.pnl_percent !== null && (
                      <span
                        className={`hidden text-xs md:inline ${
                          t.pnl_percent >= 0 ? "text-profit" : "text-loss"
                        }`}
                      >
                        {formatPercent(t.pnl_percent)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
