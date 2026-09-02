import { AlertTriangle, Shield } from "lucide-react";
import { formatSigned } from "@/lib/format";

/**
 * Prop firm guardrail banner. Shows on the dashboard whenever a daily loss
 * limit or max drawdown limit is configured for the active account and the
 * trader is using any portion of it.
 *
 * Ratios come from `propFirmStatus` in lib/analytics: 0..1 = used, >=1 =
 * breached. Colors ramp from primary → amber (>70%) → loss (>=100%).
 */
export function PropFirmBanner({
  dailyUsedPct,
  drawdownUsedPct,
  dailyBreached,
  drawdownBreached,
  todayPnl,
  currency,
}: {
  dailyUsedPct: number;
  drawdownUsedPct: number;
  dailyBreached: boolean;
  drawdownBreached: boolean;
  todayPnl: number;
  currency: string;
}) {
  const anyBreach = dailyBreached || drawdownBreached;
  const anyWarn =
    dailyUsedPct >= 0.7 || drawdownUsedPct >= 0.7;
  const tone = anyBreach
    ? "border-loss/50 bg-loss/10 text-loss"
    : anyWarn
      ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
      : "border-primary/40 bg-primary/5 text-primary";

  return (
    <div className={`grid gap-3 rounded-xl border p-4 ${tone}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        {anyBreach ? (
          <AlertTriangle className="size-4" />
        ) : (
          <Shield className="size-4" />
        )}
        {anyBreach
          ? "Risk limit breached — stop trading"
          : anyWarn
            ? "Approaching your risk limit"
            : "Risk limits — within tolerance"}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Bar
          label="Daily loss"
          used={dailyUsedPct}
          hint={`today: ${formatSigned(todayPnl, currency)}`}
        />
        <Bar label="Max drawdown" used={drawdownUsedPct} />
      </div>
    </div>
  );
}

function Bar({
  label,
  used,
  hint,
}: {
  label: string;
  used: number;
  hint?: string;
}) {
  const pct = Math.min(1, used);
  const barColor =
    used >= 1
      ? "bg-loss"
      : used >= 0.7
        ? "bg-amber-500"
        : "bg-primary";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-foreground">
        <span>{label}</span>
        <span className="num tabular-nums">
          {(used * 100).toFixed(0)}%{hint ? ` · ${hint}` : ""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/40">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
