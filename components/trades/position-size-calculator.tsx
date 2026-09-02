"use client";

import { useMemo, useState } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

/**
 * Client-side position size calculator. Given account balance, % risk,
 * entry, and stop it tells the trader how many units/shares/lots to trade.
 *
 * Formula:
 *   riskAmount = balance * riskPct / 100
 *   distance = |entry - stop|                    // in price units
 *   units = riskAmount / (distance * contractSize)
 *
 * `contractSize` is 1 for shares/crypto, 100 for options, 100_000 for FX lots.
 *
 * `onApply` optionally lets the parent form pull the computed values in
 * (initial_risk + quantity) so the calculator isn't just a display.
 */
export function PositionSizeCalculator({
  defaultBalance,
  defaultRiskPct = 1,
  currency = "USD",
  suggestedEntry,
  suggestedStop,
  suggestedContractSize = 1,
  onApply,
}: {
  defaultBalance: number;
  defaultRiskPct?: number;
  currency?: string;
  suggestedEntry?: number | null;
  suggestedStop?: number | null;
  suggestedContractSize?: number;
  onApply?: (out: { units: number; riskAmount: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState<number>(defaultBalance);
  const [riskPct, setRiskPct] = useState<number>(defaultRiskPct);
  const [entry, setEntry] = useState<number | "">(suggestedEntry ?? "");
  const [stop, setStop] = useState<number | "">(suggestedStop ?? "");
  const [contractSize, setContractSize] = useState<number>(
    suggestedContractSize,
  );

  const result = useMemo(() => {
    const riskAmount = (Number(balance) || 0) * ((Number(riskPct) || 0) / 100);
    const e = Number(entry) || 0;
    const s = Number(stop) || 0;
    const dist = Math.abs(e - s);
    if (dist === 0 || riskAmount === 0) {
      return { riskAmount, distance: 0, units: 0 };
    }
    const units = riskAmount / (dist * (contractSize || 1));
    return { riskAmount, distance: dist, units };
  }, [balance, riskPct, entry, stop, contractSize]);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm"
      >
        <span className="flex items-center gap-2 font-medium">
          <Calculator className="size-4 text-primary" />
          Position size calculator
        </span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="grid gap-3 border-t border-border/60 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Balance (${currency})`}>
              <Input
                type="number"
                step="any"
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Risk %">
              <Input
                type="number"
                step="0.1"
                value={riskPct}
                onChange={(e) => setRiskPct(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Entry price">
              <Input
                type="number"
                step="any"
                value={entry}
                onChange={(e) =>
                  setEntry(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </Field>
            <Field label="Stop price">
              <Input
                type="number"
                step="any"
                value={stop}
                onChange={(e) =>
                  setStop(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </Field>
            <Field label="Contract size (optional)">
              <Input
                type="number"
                step="any"
                value={contractSize}
                onChange={(e) => setContractSize(Number(e.target.value) || 1)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-md bg-background/60 p-3 text-xs">
            <div>
              <div className="text-muted-foreground">Risk amount</div>
              <div className="num text-base font-semibold text-foreground">
                {formatCurrency(result.riskAmount, currency)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Stop distance</div>
              <div className="num text-base font-semibold text-foreground">
                {result.distance ? result.distance.toFixed(5) : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Position size</div>
              <div className="num text-base font-semibold text-primary">
                {result.units
                  ? result.units.toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })
                  : "—"}
              </div>
            </div>
          </div>

          {onApply && result.units > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onApply({
                  units: result.units,
                  riskAmount: result.riskAmount,
                })
              }
            >
              Use these values
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}
