"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
  Info,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseMT5Statement, type ParsedTrade } from "@/lib/mt5-parser";
import { importTrades } from "@/app/(app)/actions/import";
import { formatSigned } from "@/lib/format";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { TradingAccountRow } from "@/types/database";

export function ImportView({
  accounts,
  defaultAccountId,
}: {
  accounts: TradingAccountRow[];
  defaultAccountId: string;
}) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedTrade[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  const account = accounts.find((a) => a.id === accountId);

  async function handleFile(f: File) {
    setFile(f);
    setParsed(null);
    setWarnings([]);
    setSkippedCount(0);

    const text = await f.text();
    const result = parseMT5Statement(text);
    setParsed(result.trades);
    setWarnings(result.warnings);
    setSkippedCount(result.skipped);

    if (result.trades.length === 0 && result.warnings.length === 0) {
      toast.error("No closed trades detected in that file.");
    } else if (result.trades.length > 0) {
      toast.success(
        `Detected ${result.trades.length} trade${result.trades.length === 1 ? "" : "s"}`,
      );
    }
  }

  const summary = useMemo(() => {
    if (!parsed) return null;
    const wins = parsed.filter((t) => t.pnl > 0).length;
    const losses = parsed.filter((t) => t.pnl < 0).length;
    const totalPnl = parsed.reduce((s, t) => s + t.pnl, 0);
    return { wins, losses, totalPnl };
  }, [parsed]);

  function reset() {
    setFile(null);
    setParsed(null);
    setWarnings([]);
    setSkippedCount(0);
  }

  function runImport() {
    if (!parsed || parsed.length === 0 || !accountId) return;
    startTransition(async () => {
      const res = await importTrades(accountId, parsed);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Imported ${res.inserted} new · ${res.updated} updated · ${res.skipped} skipped`,
      );
      router.push("/trades");
      router.refresh();
    });
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="grid place-items-center gap-3 py-16 text-center">
          <div className="text-muted-foreground">
            You need at least one active account before importing trades.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-[220px_1fr] md:gap-6">
          <div className="grid gap-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Import into account
            </div>
            <Select
              value={accountId}
              onValueChange={(v) => v && setAccountId(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block size-2.5 rounded-sm"
                        style={{ background: a.color ?? "var(--primary)" }}
                      />
                      {a.name}
                      <span className="text-xs text-muted-foreground">
                        {a.currency}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {account && (
              <div className="text-[11px] text-muted-foreground">
                {account.broker ?? "No broker"} · {account.account_type}
              </div>
            )}
          </div>

          {!file ? (
            <FileDrop
              dragging={dragging}
              setDragging={setDragging}
              onFile={handleFile}
            />
          ) : (
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-border/60 p-4">
              <div className="grid size-11 place-items-center rounded-lg bg-primary/15 text-primary">
                <FileText className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB ·{" "}
                  {parsed
                    ? `${parsed.length} trade${parsed.length === 1 ? "" : "s"} detected`
                    : "parsing…"}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={reset}>
                <X className="size-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            {warnings.map((w) => (
              <div
                key={w}
                className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-sm"
              >
                <Info className="mt-0.5 size-4 text-yellow-500" />
                <span>{w}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {parsed && parsed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid gap-4"
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatChip label="Detected" value={`${parsed.length}`} />
            <StatChip
              label="Wins"
              value={`${summary?.wins ?? 0}`}
              tone="profit"
            />
            <StatChip
              label="Losses"
              value={`${summary?.losses ?? 0}`}
              tone="loss"
            />
            <StatChip
              label="Net P&L"
              value={formatSigned(summary?.totalPnl ?? 0, account?.currency ?? "USD")}
              tone={(summary?.totalPnl ?? 0) >= 0 ? "profit" : "loss"}
            />
          </div>

          {skippedCount > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Skipped {skippedCount} row{skippedCount === 1 ? "" : "s"} that
              didn&apos;t look like closed positions (deposits, balance rows,
              open positions).
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card/95 backdrop-blur">
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Lots</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">Exit</TableHead>
                    <TableHead>Entry time</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.map((t) => (
                    <TableRow key={t.externalId}>
                      <TableCell className="font-medium">{t.symbol}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            t.direction === "long"
                              ? "bg-profit/15 text-profit"
                              : "bg-loss/15 text-loss"
                          }
                        >
                          {t.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="num text-right">
                        {t.volume}
                      </TableCell>
                      <TableCell className="num text-right">
                        {t.entryPrice}
                      </TableCell>
                      <TableCell className="num text-right">
                        {t.exitPrice}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(parseISO(t.entryAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "num text-right font-medium",
                          t.pnl >= 0 ? "text-profit" : "text-loss",
                        )}
                      >
                        {formatSigned(t.pnl, account?.currency ?? "USD")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <CheckCircle2 className="mr-1 inline size-3.5 text-profit" />
              Duplicate protection: re-uploading the same statement won&apos;t
              create duplicate trades (matched on MT5 position id).
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset}>
                <RefreshCcw className="mr-1.5 size-4" /> Choose different file
              </Button>
              <Button
                size="lg"
                disabled={pending || parsed.length === 0}
                onClick={runImport}
              >
                {pending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 size-4" />
                )}
                Import {parsed.length} trade{parsed.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <HowTo />
    </div>
  );
}

function FileDrop({
  dragging,
  setDragging,
  onFile,
}: {
  dragging: boolean;
  setDragging: (v: boolean) => void;
  onFile: (f: File) => void;
}) {
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn(
        "grid cursor-pointer place-items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border/60 hover:border-border",
      )}
    >
      <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Upload className="size-6" />
      </div>
      <div className="text-sm font-medium">
        Drop your MT5 statement here, or click to browse
      </div>
      <div className="text-xs text-muted-foreground">
        Accepts <code>.htm</code>, <code>.html</code>, <code>.csv</code> and{" "}
        <code>.txt</code> exports
      </div>
      <input
        type="file"
        accept=".htm,.html,.csv,.txt,text/html,text/csv,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss";
}) {
  return (
    <Card>
      <CardContent className="grid gap-1 py-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "num text-xl font-semibold tracking-tight",
            tone === "profit" && "text-profit",
            tone === "loss" && "text-loss",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function HowTo() {
  return (
    <Card>
      <CardContent className="grid gap-3 p-5">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          How to export from MetaTrader 5
        </div>
        <ol className="grid list-decimal gap-1.5 pl-5 text-sm text-muted-foreground">
          <li>
            Open the <span className="text-foreground">Toolbox</span> panel
            (Ctrl+T) and go to the{" "}
            <span className="text-foreground">History</span> tab.
          </li>
          <li>
            Right-click anywhere in the history and pick{" "}
            <span className="text-foreground">Report → HTML</span> (or{" "}
            <span className="text-foreground">Report → XLSX</span> then save-as
            CSV).
          </li>
          <li>
            Save the file, then drop it into the box above.
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
