"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  Edit,
  MoreHorizontal,
  PlusCircle,
  Star,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  archiveAccount,
  deleteAccount,
  setDefaultAccount,
} from "@/app/(app)/actions/account";
import { formatCurrency, formatSigned } from "@/lib/format";
import { AccountForm } from "./account-form";
import type { TradingAccountRow } from "@/types/database";

const TYPE_LABEL: Record<string, string> = {
  live: "Live",
  demo: "Demo",
  paper: "Paper",
};
const TYPE_TONE: Record<string, string> = {
  live: "bg-profit/15 text-profit",
  demo: "bg-primary/15 text-primary",
  paper: "bg-muted text-muted-foreground",
};

export function AccountsView({
  accounts,
  stats,
}: {
  accounts: TradingAccountRow[];
  stats: Record<
    string,
    { balance: number; totalTrades: number; openTrades: number; totalPnl: number }
  >;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TradingAccountRow | null>(null);
  const [confirmDelete, setConfirmDelete] =
    useState<TradingAccountRow | null>(null);
  const [, startTransition] = useTransition();

  const active = accounts.filter((a) => !a.is_archived);
  const archived = accounts.filter((a) => a.is_archived);

  function onArchive(a: TradingAccountRow, archived: boolean) {
    startTransition(async () => {
      const res = await archiveAccount(a.id, archived);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(archived ? "Account archived" : "Account restored");
    });
  }

  function onSetDefault(a: TradingAccountRow) {
    startTransition(async () => {
      const res = await setDefaultAccount(a.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${a.name} is now your default account`);
    });
  }

  function onDelete(a: TradingAccountRow) {
    startTransition(async () => {
      const res = await deleteAccount(a.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setConfirmDelete(null);
      toast.success("Account deleted");
    });
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {active.length} active account{active.length === 1 ? "" : "s"}
          {archived.length > 0 && ` · ${archived.length} archived`}
        </div>
        <Button onClick={() => setCreating(true)}>
          <PlusCircle className="mr-2 size-4" /> Add account
        </Button>
      </div>

      {active.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-2 py-12 text-center">
            <div className="text-muted-foreground">
              No active accounts. Create one to start logging trades.
            </div>
            <Button onClick={() => setCreating(true)} className="mt-2">
              <PlusCircle className="mr-2 size-4" /> Add your first account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((a, i) => (
            <AccountCard
              key={a.id}
              account={a}
              stats={stats[a.id]}
              index={i}
              onEdit={() => setEditing(a)}
              onSetDefault={() => onSetDefault(a)}
              onArchive={() => onArchive(a, true)}
              onDelete={() => setConfirmDelete(a)}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="grid gap-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Archived
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {archived.map((a) => (
              <Card key={a.id} className="opacity-70">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="grid size-10 shrink-0 place-items-center rounded-lg text-xs font-semibold text-primary-foreground"
                      style={{ background: a.color ?? "var(--primary)" }}
                    >
                      {a.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {stats[a.id]?.totalTrades ?? 0} trades ·{" "}
                        {formatCurrency(
                          stats[a.id]?.balance ?? a.starting_balance,
                          a.currency,
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onArchive(a, false)}
                  >
                    <ArchiveRestore className="mr-1.5 size-4" /> Restore
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add trading account</DialogTitle>
            <DialogDescription>
              Give it a name (e.g. &quot;MT5 Live&quot;), pick a currency and
              your starting balance.
            </DialogDescription>
          </DialogHeader>
          <AccountForm
            onDone={() => setCreating(false)}
            asFirst={accounts.length === 0}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
          </DialogHeader>
          {editing && (
            <AccountForm
              initial={editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this account?</DialogTitle>
            <DialogDescription>
              Trades will remain but will no longer be linked to this account.
              You can archive instead to preserve the linkage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && onDelete(confirmDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountCard({
  account,
  stats,
  index,
  onEdit,
  onSetDefault,
  onArchive,
  onDelete,
}: {
  account: TradingAccountRow;
  stats?: {
    balance: number;
    totalTrades: number;
    openTrades: number;
    totalPnl: number;
  };
  index: number;
  onEdit: () => void;
  onSetDefault: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const balance = stats?.balance ?? account.starting_balance;
  const pnl = stats?.totalPnl ?? 0;
  const positive = pnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Card className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{ background: account.color ?? "var(--primary)" }}
        />
        <CardContent className="grid gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold text-primary-foreground shadow-sm"
                style={{ background: account.color ?? "var(--primary)" }}
              >
                {account.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-base font-semibold">
                    {account.name}
                  </span>
                  {account.is_default && (
                    <Star className="size-3.5 shrink-0 fill-primary text-primary" />
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {account.broker ?? "No broker set"}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 size-4" /> Edit
                </DropdownMenuItem>
                {!account.is_default && (
                  <DropdownMenuItem onClick={onSetDefault}>
                    <Star className="mr-2 size-4" /> Set as default
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="mr-2 size-4" /> Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-loss"
                >
                  <Trash2 className="mr-2 size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={TYPE_TONE[account.account_type] ?? ""}>
              {TYPE_LABEL[account.account_type] ?? account.account_type}
            </Badge>
            <Badge variant="secondary">{account.currency}</Badge>
            {account.is_default && (
              <Badge variant="outline" className="border-primary/40 text-primary">
                Default
              </Badge>
            )}
          </div>

          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Current balance
            </div>
            <div className="num mt-1 text-3xl font-semibold tracking-tight">
              {formatCurrency(balance, account.currency)}
            </div>
            <div
              className={`num mt-1 text-xs font-medium ${
                pnl === 0
                  ? "text-muted-foreground"
                  : positive
                    ? "text-profit"
                    : "text-loss"
              }`}
            >
              {pnl === 0 ? "—" : formatSigned(pnl, account.currency)}
              {" · "}
              <span className="text-muted-foreground">
                start {formatCurrency(account.starting_balance, account.currency)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Trades
              </div>
              <div className="num text-sm font-semibold">
                {stats?.totalTrades ?? 0}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Open positions
              </div>
              <div className="num text-sm font-semibold">
                {stats?.openTrades ?? 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
