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
  Trash2,
  Target,
  ListChecks,
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
  archivePlaybook,
  deletePlaybook,
} from "@/app/(app)/actions/playbook";
import { formatSigned } from "@/lib/format";
import { PlaybookForm } from "./playbook-form";
import type { PlaybookRow } from "@/types/database";

export type PlaybookStat = {
  playbook_id: string | null;
  count: number;
  pnl: number;
  winRate: number;
  expectancyR: number;
  profitFactor: number;
};

export function PlaybooksView({
  playbooks,
  stats,
  currency,
}: {
  playbooks: PlaybookRow[];
  stats: Record<string, PlaybookStat>;
  currency: string;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlaybookRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PlaybookRow | null>(null);
  const [, startTransition] = useTransition();

  const active = playbooks.filter((p) => !p.is_archived);
  const archived = playbooks.filter((p) => p.is_archived);

  function onArchive(p: PlaybookRow, archive: boolean) {
    startTransition(async () => {
      const res = await archivePlaybook(p.id, archive);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(archive ? "Playbook archived" : "Playbook restored");
    });
  }

  function onDelete(p: PlaybookRow) {
    startTransition(async () => {
      const res = await deletePlaybook(p.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setConfirmDelete(null);
      toast.success("Playbook deleted");
    });
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {active.length} active playbook{active.length === 1 ? "" : "s"}
          {archived.length > 0 && ` · ${archived.length} archived`}
        </div>
        <Button onClick={() => setCreating(true)}>
          <PlusCircle className="mr-2 size-4" /> New playbook
        </Button>
      </div>

      {active.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-3 py-14 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ListChecks className="size-6" />
            </div>
            <div className="text-lg font-semibold">Build your playbook</div>
            <div className="max-w-md text-sm text-muted-foreground">
              Every pro trader groups trades by <em>setup</em> — breakout,
              reversal, retest. That&apos;s how you learn which setups actually
              make money. Start with one.
            </div>
            <Button onClick={() => setCreating(true)} className="mt-2">
              <PlusCircle className="mr-2 size-4" /> Add your first playbook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((p, i) => (
            <PlaybookCard
              key={p.id}
              playbook={p}
              stat={stats[p.id]}
              currency={currency}
              index={i}
              onEdit={() => setEditing(p)}
              onArchive={() => onArchive(p, true)}
              onDelete={() => setConfirmDelete(p)}
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
            {archived.map((p) => (
              <Card key={p.id} className="opacity-70">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="size-3 shrink-0 rounded-sm"
                      style={{ background: p.color ?? "var(--primary)" }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {stats[p.id]?.count ?? 0} trades
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onArchive(p, false)}
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
            <DialogTitle>New playbook</DialogTitle>
            <DialogDescription>
              A playbook is a repeatable setup. Give it rules that define a
              valid entry — analytics will show you which setup makes money.
            </DialogDescription>
          </DialogHeader>
          <PlaybookForm onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit playbook</DialogTitle>
          </DialogHeader>
          {editing && (
            <PlaybookForm initial={editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this playbook?</DialogTitle>
            <DialogDescription>
              Trades tagged with this playbook will remain, but they&apos;ll no
              longer be linked to it. Archive instead to preserve links.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
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

function PlaybookCard({
  playbook,
  stat,
  currency,
  index,
  onEdit,
  onArchive,
  onDelete,
}: {
  playbook: PlaybookRow;
  stat?: PlaybookStat;
  currency: string;
  index: number;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const pnl = stat?.pnl ?? 0;
  const positive = pnl >= 0;
  const target = playbook.target_r_multiple;
  const actualR = stat?.expectancyR ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Card className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{ background: playbook.color ?? "var(--primary)" }}
        />
        <CardContent className="grid gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">
                {playbook.name}
              </div>
              {playbook.description && (
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {playbook.description}
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 size-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="mr-2 size-4" /> Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-loss">
                  <Trash2 className="mr-2 size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="gap-1">
              <ListChecks className="size-3" />
              {playbook.checklist.length} rule
              {playbook.checklist.length === 1 ? "" : "s"}
            </Badge>
            {target && (
              <Badge variant="outline" className="gap-1">
                <Target className="size-3" /> {target}R target
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-3">
            <Stat label="Trades" value={stat?.count ?? 0} />
            <Stat
              label="Win rate"
              value={`${stat?.winRate ?? 0}%`}
              accent="muted"
            />
            <Stat
              label="P&L"
              value={pnl === 0 ? "—" : formatSigned(pnl, currency)}
              accent={pnl === 0 ? "muted" : positive ? "profit" : "loss"}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Expectancy (R)"
              value={actualR.toFixed(2)}
              accent={actualR > 0 ? "profit" : actualR < 0 ? "loss" : "muted"}
            />
            <Stat
              label="Profit factor"
              value={
                stat?.profitFactor === undefined || stat.profitFactor === 0
                  ? "—"
                  : stat.profitFactor === Infinity
                    ? "∞"
                    : stat.profitFactor.toFixed(2)
              }
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string | number;
  accent?: "default" | "profit" | "loss" | "muted";
}) {
  const cls =
    accent === "profit"
      ? "text-profit"
      : accent === "loss"
        ? "text-loss"
        : accent === "muted"
          ? "text-muted-foreground"
          : "";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`num text-sm font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
