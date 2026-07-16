"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveAccount } from "@/app/(app)/actions/account";
import { cn } from "@/lib/utils";
import type { AccountType, TradingAccountRow } from "@/types/database";

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "JPY",
  "AUD",
  "CAD",
  "SGD",
  "CHF",
  "HKD",
];

const COLORS = [
  "#8B5CF6", // violet
  "#22C55E", // green
  "#F97316", // orange
  "#3B82F6", // blue
  "#EAB308", // yellow
  "#EF4444", // red
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#A855F7", // purple
  "#14B8A6", // teal
];

const TYPES: { value: AccountType; label: string; hint: string }[] = [
  { value: "live", label: "Live", hint: "Real money account" },
  { value: "demo", label: "Demo", hint: "Broker's demo / practice account" },
  { value: "paper", label: "Paper", hint: "Personal paper-trading log" },
];

export function AccountForm({
  initial,
  onDone,
  asFirst,
}: {
  initial?: TradingAccountRow;
  onDone: () => void;
  asFirst?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [broker, setBroker] = useState(initial?.broker ?? "");
  const [type, setType] = useState<AccountType>(
    initial?.account_type ?? "live",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");
  const [startingBalance, setStartingBalance] = useState<number>(
    initial?.starting_balance ?? 0,
  );
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [isDefault, setIsDefault] = useState(
    initial?.is_default ?? asFirst ?? false,
  );
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) {
      toast.error("Account name is required");
      return;
    }
    startTransition(async () => {
      const res = await saveAccount({
        id: initial?.id,
        name: name.trim(),
        broker: broker.trim() || null,
        account_type: type,
        currency,
        starting_balance: Number(startingBalance) || 0,
        color,
        is_default: isDefault,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(initial ? "Account updated" : "Account created");
      onDone();
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="account-name">Account name</Label>
        <Input
          id="account-name"
          placeholder="e.g. MT5 Live · IC Markets"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="account-broker">Broker / exchange (optional)</Label>
        <Input
          id="account-broker"
          placeholder="e.g. IC Markets, Binance, Interactive Brokers"
          value={broker}
          onChange={(e) => setBroker(e.target.value)}
        />
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {TYPES.map((t) => (
          <button
            type="button"
            key={t.value}
            onClick={() => setType(t.value)}
            className={cn(
              "rounded-lg border p-2.5 text-left transition-all",
              type === t.value
                ? "border-primary bg-primary/10"
                : "border-border/60 hover:border-border",
            )}
          >
            <div className="text-sm font-medium">{t.label}</div>
            <div className="text-[11px] text-muted-foreground">
              {t.hint}
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="account-currency">Currency</Label>
          <Select
            value={currency}
            onValueChange={(v) => v && setCurrency(v)}
          >
            <SelectTrigger id="account-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="account-balance">Starting balance</Label>
          <Input
            id="account-balance"
            type="number"
            step="any"
            value={startingBalance}
            onChange={(e) => setStartingBalance(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Colour</Label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "size-8 rounded-md ring-2 transition-all",
                color === c
                  ? "ring-primary ring-offset-2 ring-offset-background"
                  : "ring-transparent hover:scale-110",
              )}
              style={{ background: c }}
              aria-label={`Choose colour ${c}`}
            />
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
        />
        <span className="flex-1">Set as default account</span>
        <span className="text-xs text-muted-foreground">
          New trades will be logged here unless you switch.
        </span>
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {initial ? "Save changes" : "Create account"}
        </Button>
      </div>
    </div>
  );
}
