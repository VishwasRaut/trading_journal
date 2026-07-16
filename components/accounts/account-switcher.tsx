"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  Wallet,
  PlusCircle,
  Loader2,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { setCurrentAccount } from "@/app/(app)/actions/account";
import { ALL_ACCOUNTS } from "@/lib/accounts";
import { formatCurrency } from "@/lib/format";
import type { TradingAccountRow } from "@/types/database";

const TYPE_LABEL: Record<string, string> = {
  live: "Live",
  demo: "Demo",
  paper: "Paper",
};

export function AccountSwitcher({
  accounts,
  currentAccountId,
  balances,
}: {
  accounts: TradingAccountRow[];
  currentAccountId: string;
  balances: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-account-switcher]")) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const active = accounts.find((a) => a.id === currentAccountId);
  const isAll = currentAccountId === ALL_ACCOUNTS;

  const activeLabel = isAll ? "All accounts" : active?.name ?? "Select account";
  const totalBalance = Object.values(balances).reduce((s, v) => s + v, 0);
  const activeBalance = isAll
    ? totalBalance
    : active
      ? balances[active.id] ?? active.starting_balance
      : 0;
  const activeCurrency = isAll ? "USD" : active?.currency ?? "USD";

  function pick(id: string) {
    setOpen(false);
    startTransition(async () => {
      await setCurrentAccount(id);
      router.refresh();
    });
  }

  return (
    <div className="relative" data-account-switcher>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 pr-2 text-left text-sm shadow-xs transition-all",
          "hover:border-border hover:shadow-sm",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
        )}
      >
        <div className="grid size-6 place-items-center rounded-md bg-primary/15 text-primary">
          {isAll ? (
            <LayoutGrid className="size-3.5" />
          ) : (
            <Wallet className="size-3.5" />
          )}
        </div>
        <div className="hidden min-w-0 flex-col leading-tight md:flex">
          <span className="truncate text-xs font-medium">{activeLabel}</span>
          <span className="num truncate text-[10px] text-muted-foreground">
            {formatCurrency(activeBalance, activeCurrency)}
          </span>
        </div>
        {pending ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute left-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-2xl shadow-black/25 ring-1 ring-foreground/5"
          >
            <div className="border-b border-border/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Trading accounts
            </div>

            <div className="max-h-72 overflow-y-auto p-1">
              <button
                type="button"
                onClick={() => pick(ALL_ACCOUNTS)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                  isAll ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <div className="grid size-8 place-items-center rounded-md bg-primary/15 text-primary">
                  <LayoutGrid className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">All accounts</div>
                  <div className="text-[10px] text-muted-foreground">
                    combined view
                  </div>
                </div>
                <div className="num text-right">
                  <div className="text-sm font-medium">
                    {formatCurrency(totalBalance, "USD")}
                  </div>
                </div>
                {isAll && <Check className="size-4 text-primary" />}
              </button>

              {accounts.length > 0 && (
                <div className="my-1 border-t border-border/60" />
              )}

              {accounts.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No accounts yet.
                </div>
              ) : (
                accounts
                  .filter((a) => !a.is_archived)
                  .map((a) => {
                    const bal = balances[a.id] ?? a.starting_balance;
                    const isActive = a.id === currentAccountId;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => pick(a.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                          isActive ? "bg-accent" : "hover:bg-accent/50",
                        )}
                      >
                        <div
                          className="grid size-8 shrink-0 place-items-center rounded-md text-[10px] font-semibold uppercase tracking-wider text-primary-foreground"
                          style={{
                            background: a.color ?? "var(--primary)",
                          }}
                        >
                          {a.name.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">
                              {a.name}
                            </span>
                            {a.is_default && (
                              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {TYPE_LABEL[a.account_type] ?? a.account_type}
                            {a.broker ? ` · ${a.broker}` : ""} · {a.currency}
                          </div>
                        </div>
                        <div className="num text-right">
                          <div className="text-sm font-medium">
                            {formatCurrency(bal, a.currency)}
                          </div>
                        </div>
                        {isActive && (
                          <Check className="size-4 text-primary" />
                        )}
                      </button>
                    );
                  })
              )}
            </div>

            <div className="border-t border-border/60 p-1">
              <Link
                href="/accounts"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent/50"
              >
                <PlusCircle className="size-4 text-primary" />
                <span>Add / manage accounts</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
