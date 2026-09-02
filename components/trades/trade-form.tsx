"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
  Target,
  ListChecks,
} from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  tradeFormSchema,
  type TradeFormInput,
  type TradeFormValues,
} from "@/lib/schemas";
import { computePnl, pnlPercent } from "@/lib/analytics";
import { formatSigned, formatPercent } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { ImageUploader, type PendingImage } from "./image-uploader";
import { SymbolPicker } from "./symbol-picker";
import { PositionSizeCalculator } from "./position-size-calculator";
import {
  defaultContractSize,
  findSymbol,
  sizeFieldLabel,
} from "@/lib/symbols";
import type { TradeWithRelations } from "@/lib/trades";
import type {
  Emotion,
  ExecutionGrade,
  Market,
  MistakeCode,
  PlaybookRow,
  TradingAccountRow,
} from "@/types/database";
import { MISTAKE_CODES } from "@/types/database";

const MISTAKE_LABELS: Record<MistakeCode, string> = {
  chased_entry: "Chased entry",
  moved_stop: "Moved stop",
  oversized: "Oversized",
  no_stop: "No stop loss",
  revenge_trade: "Revenge trade",
  no_plan: "No plan",
  ignored_news: "Ignored news",
  fomo_entry: "FOMO entry",
  early_exit: "Exited early",
  held_loser: "Held a loser",
  against_trend: "Against trend",
  overtraded: "Overtraded",
};

const EMOTIONS: { value: Emotion; label: string; tone: "profit" | "loss" | "muted" }[] = [
  { value: "calm", label: "Calm", tone: "profit" },
  { value: "focused", label: "Focused", tone: "profit" },
  { value: "confident", label: "Confident", tone: "profit" },
  { value: "anxious", label: "Anxious", tone: "loss" },
  { value: "fearful", label: "Fearful", tone: "loss" },
  { value: "greedy", label: "Greedy", tone: "loss" },
  { value: "fomo", label: "FOMO", tone: "loss" },
  { value: "revenge", label: "Revenge", tone: "loss" },
  { value: "bored", label: "Bored", tone: "muted" },
  { value: "tired", label: "Tired", tone: "muted" },
  { value: "euphoric", label: "Euphoric", tone: "loss" },
  { value: "frustrated", label: "Frustrated", tone: "loss" },
];

const MARKETS: { value: Market | "all"; label: string }[] = [
  { value: "all", label: "All markets" },
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
  { value: "equity", label: "Stocks / Equity" },
  { value: "options", label: "Options" },
  { value: "futures", label: "Futures" },
];

const marketsWithContractSize: Market[] = ["forex", "futures", "options"];

function toDateInputValue(iso?: string | null) {
  if (!iso) return "";
  // The stored value is UTC — slice the date portion off the ISO string
  // so the picker shows the same day everywhere regardless of user timezone.
  return iso.slice(0, 10);
}

function dateStringToIso(value: string) {
  // Store `YYYY-MM-DD` as UTC midnight. This way the exact same day is shown
  // regardless of server/client timezone, and no offset math is needed.
  return `${value}T00:00:00.000Z`;
}

export function TradeForm({
  userId,
  initial,
  accounts,
  defaultAccountId,
  playbooks = [],
}: {
  userId: string;
  initial?: TradeWithRelations | null;
  accounts: TradingAccountRow[];
  defaultAccountId: string;
  playbooks?: PlaybookRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<TradeFormInput, unknown, TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: initial
      ? {
          symbol: initial.symbol,
          market: initial.market,
          account_id:
            initial.account_id ??
            defaultAccountId ??
            accounts[0]?.id ??
            "",
          playbook_id: initial.playbook_id ?? null,
          status: initial.status,
          direction: initial.direction,
          entry_price: initial.entry_price,
          exit_price: initial.exit_price ?? undefined,
          quantity: initial.quantity,
          lot_size: initial.lot_size ?? undefined,
          entry_at: toDateInputValue(initial.entry_at),
          exit_at: toDateInputValue(initial.exit_at),
          fees: initial.fees ?? 0,
          stop_loss: initial.stop_loss ?? undefined,
          take_profit: initial.take_profit ?? undefined,
          planned_entry: initial.planned_entry ?? undefined,
          planned_stop: initial.planned_stop ?? undefined,
          planned_target: initial.planned_target ?? undefined,
          thesis: initial.thesis ?? "",
          initial_risk: initial.initial_risk ?? undefined,
          checklist_completed: initial.checklist_completed ?? [],
          execution_grade: initial.execution_grade ?? null,
          emotion_pre: initial.emotion_pre ?? null,
          emotion_post: initial.emotion_post ?? null,
          mistake_codes: initial.trade_mistakes?.map((m) => m.code) ?? [],
          strategy: initial.strategy ?? "",
          notes_entry: initial.notes_entry ?? "",
          notes_exit: initial.notes_exit ?? "",
          mistakes: initial.mistakes ?? "",
          tags: initial.trade_tags?.map((t) => t.tag) ?? [],
        }
      : {
          symbol: "",
          market: "forex",
          account_id: defaultAccountId ?? accounts[0]?.id ?? "",
          playbook_id: null,
          status: "open",
          direction: "long",
          entry_price: 0,
          exit_price: undefined,
          quantity: 0,
          lot_size: undefined,
          entry_at: toDateInputValue(new Date().toISOString()),
          exit_at: "",
          fees: 0,
          stop_loss: undefined,
          take_profit: undefined,
          planned_entry: undefined,
          planned_stop: undefined,
          planned_target: undefined,
          thesis: "",
          initial_risk: undefined,
          checklist_completed: [],
          execution_grade: null,
          emotion_pre: null,
          emotion_post: null,
          mistake_codes: [],
          strategy: "",
          notes_entry: "",
          notes_exit: "",
          mistakes: "",
          tags: [],
        },
  });

  const uiMarket = form.watch("market") as Market | "all";
  const symbol = form.watch("symbol");
  const direction = form.watch("direction");
  const entry = Number(form.watch("entry_price")) || 0;
  const exit = Number(form.watch("exit_price")) || 0;
  const qty = Number(form.watch("quantity")) || 0;
  const fees = Number(form.watch("fees")) || 0;
  const lot = Number(form.watch("lot_size")) || 0;

  // When the picker is in "all" mode we still need sensible defaults for the
  // size labels/contract-size UI — treat it as forex until the user picks a
  // symbol (at which point we snap the market to the symbol's category).
  const effectiveMarket: Market = uiMarket === "all" ? "forex" : uiMarket;
  const sizeLabel = sizeFieldLabel(effectiveMarket);
  const showContractSize =
    uiMarket !== "all" && marketsWithContractSize.includes(uiMarket);
  const symbolEntry = findSymbol(symbol ?? "");
  const effectiveContractSize = showContractSize
    ? lot || symbolEntry?.contractSize || defaultContractSize(effectiveMarket)
    : 1;

  // Auto-populate the contract size when the user picks a known symbol,
  // or when they switch markets. We only overwrite if the user hasn't
  // typed a custom value that matches nothing we know about.
  useEffect(() => {
    if (!showContractSize) {
      if (lot !== 0) {
        form.setValue("lot_size", undefined, { shouldDirty: true });
      }
      return;
    }
    const desired =
      symbolEntry?.contractSize ?? defaultContractSize(effectiveMarket);
    if (!lot || lot !== desired) {
      // Only overwrite if empty, or if it matches a previous known preset
      // (this preserves manual overrides while snapping on symbol changes).
      const isKnownPreset =
        lot === 0 ||
        lot === 100 ||
        lot === 5000 ||
        lot === 100_000 ||
        lot === 50 ||
        lot === 20 ||
        lot === 5 ||
        lot === 2 ||
        lot === 1000 ||
        lot === 10000;
      if (!lot || isKnownPreset) {
        form.setValue("lot_size", desired, { shouldDirty: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, uiMarket, showContractSize]);

  const positionValue = qty * effectiveContractSize;
  const previewPnl =
    entry > 0 && exit > 0 && qty > 0
      ? computePnl(
          entry,
          exit,
          qty,
          direction,
          fees,
          showContractSize ? effectiveContractSize : null,
        )
      : null;
  const previewPct =
    entry > 0 && exit > 0 ? pnlPercent(entry, exit, direction) : null;

  const tags = form.watch("tags") ?? [];
  const status = form.watch("status");
  const selectedPlaybookId = form.watch("playbook_id");
  const selectedPlaybook = useMemo(
    () => playbooks.find((p) => p.id === selectedPlaybookId) ?? null,
    [playbooks, selectedPlaybookId],
  );
  const checklistCompleted = form.watch("checklist_completed") ?? [];
  const selectedAccount = accounts.find(
    (a) => a.id === form.watch("account_id"),
  );
  const sl = Number(form.watch("stop_loss")) || 0;
  const pe = Number(form.watch("planned_entry")) || 0;
  const ps = Number(form.watch("planned_stop")) || 0;
  const pt = Number(form.watch("planned_target")) || 0;
  const plannedRR =
    ps > 0 && pe > 0 && pt > 0 && Math.abs(pe - ps) > 0
      ? Math.abs(pt - pe) / Math.abs(pe - ps)
      : null;

  function toggleChecklistItem(id: string) {
    const cur = checklistCompleted;
    const next = cur.includes(id)
      ? cur.filter((x) => x !== id)
      : [...cur, id];
    form.setValue("checklist_completed", next, { shouldDirty: true });
  }

  function addTag() {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    form.setValue("tags", [...tags, trimmed], { shouldDirty: true });
    setTagInput("");
  }

  function removeTag(t: string) {
    form.setValue(
      "tags",
      tags.filter((x) => x !== t),
      { shouldDirty: true },
    );
  }

  function onSubmit(values: TradeFormValues) {
    startTransition(async () => {
      // zod's refine on market rejects "all", so values.market is
      // guaranteed to be a concrete Market by the time we reach here.
      const market: Market = values.market;

      const supabase = createClient();
      // Status is user-chosen (planned/open/closed) — we only compute pnl
      // when the trade is explicitly closed with an exit price + time.
      const isClosed =
        values.status === "closed" && !!values.exit_price && !!values.exit_at;
      const pnl = isClosed
        ? computePnl(
            values.entry_price,
            values.exit_price!,
            values.quantity,
            values.direction,
            values.fees,
            marketsWithContractSize.includes(market)
              ? values.lot_size ?? null
              : null,
          )
        : null;
      const pnl_pct = isClosed
        ? pnlPercent(values.entry_price, values.exit_price!, values.direction)
        : null;

      const payload = {
        user_id: userId,
        account_id: values.account_id,
        playbook_id: values.playbook_id || null,
        symbol: values.symbol,
        market,
        direction: values.direction,
        entry_price: values.entry_price,
        exit_price: values.exit_price ?? null,
        quantity: values.quantity,
        lot_size: marketsWithContractSize.includes(market)
          ? values.lot_size ?? null
          : null,
        entry_at: dateStringToIso(values.entry_at),
        exit_at: values.exit_at ? dateStringToIso(values.exit_at) : null,
        status: values.status,
        pnl,
        pnl_percent: pnl_pct,
        fees: values.fees,
        stop_loss: values.stop_loss ?? null,
        take_profit: values.take_profit ?? null,
        planned_entry: values.planned_entry ?? null,
        planned_stop: values.planned_stop ?? null,
        planned_target: values.planned_target ?? null,
        thesis: values.thesis || null,
        initial_risk: values.initial_risk ?? null,
        checklist_completed: values.checklist_completed ?? [],
        execution_grade: values.execution_grade ?? null,
        emotion_pre: values.emotion_pre ?? null,
        emotion_post: values.emotion_post ?? null,
        strategy: values.strategy || null,
        notes_entry: values.notes_entry || null,
        notes_exit: values.notes_exit || null,
        mistakes: values.mistakes || null,
      };

      let tradeId = initial?.id;
      if (initial) {
        const { user_id: _uid, ...updatePayload } = payload;
        void _uid;
        const { error } = await supabase
          .from("trades")
          .update(updatePayload)
          .eq("id", initial.id);
        if (error) {
          toast.error(error.message);
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("trades")
          .insert(payload)
          .select("id")
          .single();
        if (error) {
          toast.error(error.message);
          return;
        }
        tradeId = data.id;
      }

      if (!tradeId) return;

      // Sync tags: naive strategy — delete all and re-insert.
      await supabase.from("trade_tags").delete().eq("trade_id", tradeId);
      if (values.tags.length) {
        const { error: tagsErr } = await supabase.from("trade_tags").insert(
          values.tags.map((tag) => ({ trade_id: tradeId!, tag })),
        );
        if (tagsErr) toast.warning(`Tags: ${tagsErr.message}`);
      }

      // Sync mistake taxonomy — same pattern.
      await supabase.from("trade_mistakes").delete().eq("trade_id", tradeId);
      const mistakes = values.mistake_codes ?? [];
      if (mistakes.length) {
        const { error: mistakesErr } = await supabase
          .from("trade_mistakes")
          .insert(
            mistakes.map((code) => ({ trade_id: tradeId!, code })),
          );
        if (mistakesErr)
          toast.warning(`Mistake tags: ${mistakesErr.message}`);
      }

      // Upload any pending images
      if (pendingImages.length) {
        for (const img of pendingImages) {
          const path = `${userId}/${tradeId}/${crypto.randomUUID()}-${img.file.name}`;
          const { error: upErr } = await supabase.storage
            .from("trade-charts")
            .upload(path, img.file, {
              cacheControl: "3600",
              upsert: false,
              contentType: img.file.type,
            });
          if (upErr) {
            toast.error(`Upload failed: ${upErr.message}`);
            continue;
          }
          await supabase.from("trade_images").insert({
            trade_id: tradeId,
            kind: img.kind,
            storage_path: path,
            caption: img.caption || null,
          });
        }
      }

      toast.success(initial ? "Trade updated" : "Trade saved");
      router.push(`/trades/${tradeId}`);
      router.refresh();
    });
  }

  async function onDelete() {
    if (!initial) return;
    const supabase = createClient();
    const { error } = await supabase.from("trades").delete().eq("id", initial.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Trade deleted");
    router.push("/trades");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Instrument & direction</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol</FormLabel>
                  <FormControl>
                    <SymbolPicker
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onPick={(entry) => {
                        // When browsing All markets, snap the market select
                        // to whatever category the picked symbol belongs to.
                        if (entry && uiMarket === "all") {
                          form.setValue("market", entry.markets[0], {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                      market={uiMarket}
                      placeholder="e.g. EURUSD, BTCUSDT, XAUUSD..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="market"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Market</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MARKETS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Account</FormLabel>
                  <Select
                    onValueChange={(v) => v && field.onChange(v)}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick an account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts
                        .filter((a) => !a.is_archived)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="inline-block size-2.5 rounded-sm"
                                style={{
                                  background: a.color ?? "var(--primary)",
                                }}
                              />
                              <span className="font-medium">{a.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {a.currency}
                                {a.broker ? ` · ${a.broker}` : ""}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="playbook_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Playbook / setup</FormLabel>
                  <Select
                    onValueChange={(v) =>
                      field.onChange(v === "__none__" ? null : v)
                    }
                    value={field.value ?? "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a setup..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground">
                          No playbook
                        </span>
                      </SelectItem>
                      {playbooks
                        .filter((p) => !p.is_archived)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="inline-block size-2.5 rounded-sm"
                                style={{ background: p.color ?? "var(--primary)" }}
                              />
                              <span className="font-medium">{p.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Group by setup so analytics can tell you which one works.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="planned">
                        Planned — not entered yet
                      </SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Direction</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => field.onChange("long")}
                      className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-all ${
                        field.value === "long"
                          ? "border-profit bg-profit/10 text-profit"
                          : "border-border/60 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <TrendingUp className="size-4" /> Long
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("short")}
                      className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-all ${
                        field.value === "short"
                          ? "border-loss bg-loss/10 text-loss"
                          : "border-border/60 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <TrendingDown className="size-4" /> Short
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4 text-primary" /> Plan & risk
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="thesis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thesis</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Why this trade? What's the setup and the invalidation? Write this *before* entering."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Writing the plan before entry beats journaling after.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="planned_entry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned entry</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="planned_stop"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned stop</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="planned_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned target</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {plannedRR !== null && (
              <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Planned R:R</span>
                <span className="num font-semibold text-foreground">
                  {plannedRR.toFixed(2)}
                </span>
                {selectedPlaybook?.target_r_multiple && (
                  <span className="text-muted-foreground">
                    · target {selectedPlaybook.target_r_multiple}R
                  </span>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="initial_risk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Initial risk ({selectedAccount?.currency ?? "USD"})
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 100"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Dollars at risk on this trade. Powers R-multiples and
                    expectancy — without this, you can&apos;t measure edge.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <PositionSizeCalculator
              defaultBalance={selectedAccount?.starting_balance ?? 10000}
              currency={selectedAccount?.currency ?? "USD"}
              suggestedEntry={pe || entry || null}
              suggestedStop={ps || sl || null}
              suggestedContractSize={effectiveContractSize}
              onApply={({ units, riskAmount }) => {
                form.setValue("quantity", Number(units.toFixed(4)), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                form.setValue("initial_risk", Number(riskAmount.toFixed(2)), {
                  shouldDirty: true,
                });
              }}
            />

            {selectedPlaybook && selectedPlaybook.checklist.length > 0 && (
              <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/10 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ListChecks className="size-4 text-primary" />
                  Rule checklist ({checklistCompleted.length}/
                  {selectedPlaybook.checklist.length})
                </div>
                <div className="grid gap-1.5">
                  {selectedPlaybook.checklist.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent/40"
                    >
                      <Checkbox
                        checked={checklistCompleted.includes(item.id)}
                        onCheckedChange={() => toggleChecklistItem(item.id)}
                        className="mt-0.5"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="emotion_pre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emotion at entry</FormLabel>
                  <EmotionPicker
                    value={field.value ?? null}
                    onChange={field.onChange}
                  />
                  <FormDescription>
                    How you felt right before pulling the trigger.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entry & exit</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="entry_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entry price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="exit_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exit price (leave empty if open)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{sizeLabel.label}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step={sizeLabel.step}
                      inputMode="decimal"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>{sizeLabel.hint}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <AnimatePresence>
              {showContractSize && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <FormField
                    control={form.control}
                    name="lot_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          <span>Contract size</span>
                          {symbolEntry && (
                            <span className="text-[10px] font-normal text-muted-foreground">
                              auto-filled
                            </span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            inputMode="numeric"
                            placeholder={`${defaultContractSize(effectiveMarket)}`}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          {effectiveMarket === "forex"
                            ? "Units per 1.00 lot (100,000 for FX; auto-set for metals)"
                            : effectiveMarket === "futures"
                              ? "Multiplier per contract (auto-set from symbol)"
                              : "1 US options contract = 100 shares"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {showContractSize && qty > 0 && (
              <motion.div
                key={`${positionValue}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Position value
                  </span>
                  <span className="text-xs">
                    {qty} {sizeLabel.label.toLowerCase()} × {effectiveContractSize.toLocaleString()}
                  </span>
                </div>
                <div className="font-mono text-sm font-medium tabular-nums">
                  {positionValue.toLocaleString()}{" "}
                  <span className="text-xs text-muted-foreground">units</span>
                </div>
              </motion.div>
            )}
            <FormField
              control={form.control}
              name="entry_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entry date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="exit_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exit date (leave empty if open)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stop_loss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stop loss</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="take_profit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Take profit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fees / commission</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {previewPnl !== null && (
              <motion.div
                key={`${previewPnl}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`md:col-span-2 rounded-xl border p-4 ${
                  previewPnl >= 0
                    ? "border-profit/40 bg-profit/10"
                    : "border-loss/40 bg-loss/10"
                }`}
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Projected P&L
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  <div
                    className={`text-2xl font-semibold ${
                      previewPnl >= 0 ? "text-profit" : "text-loss"
                    }`}
                  >
                    {formatSigned(previewPnl)}
                  </div>
                  {previewPct !== null && (
                    <div
                      className={`text-sm font-medium ${
                        previewPct >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatPercent(previewPct)}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strategy, notes & tags</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="strategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy / setup name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Breakout, Reversal, FVG, ORB..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Tags</FormLabel>
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-input p-2">
                {tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => removeTag(t)}
                  >
                    {t} <span className="text-muted-foreground">×</span>
                  </Badge>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder={tags.length ? "" : "Add a tag and hit Enter"}
                  className="flex-1 min-w-[120px] bg-transparent px-1 text-sm outline-none"
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes_entry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Why did you take this trade?</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Setup, thesis, confluences..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes_exit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What happened?</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="How did the trade play out? What did price do?"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emotion_post"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emotion at exit</FormLabel>
                  <EmotionPicker
                    value={field.value ?? null}
                    onChange={field.onChange}
                  />
                  <FormDescription>
                    Reveals how P&L outcomes are affecting your psychology.
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mistake_codes"
              render={({ field }) => {
                const selected = field.value ?? [];
                function toggle(code: MistakeCode) {
                  if (selected.includes(code)) {
                    field.onChange(selected.filter((c) => c !== code));
                  } else {
                    field.onChange([...selected, code]);
                  }
                }
                return (
                  <FormItem>
                    <FormLabel>Mistake tags</FormLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {MISTAKE_CODES.map((code) => {
                        const on = selected.includes(code);
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => toggle(code)}
                            className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                              on
                                ? "border-loss/50 bg-loss/10 text-loss"
                                : "border-border/60 text-muted-foreground hover:border-border"
                            }`}
                          >
                            {MISTAKE_LABELS[code]}
                          </button>
                        );
                      })}
                    </div>
                    <FormDescription>
                      Tag recurring mistakes so analytics can count them.
                    </FormDescription>
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="mistakes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mistakes / lessons (freeform)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="What would you do differently?"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="execution_grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Execution grade</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {(["A", "B", "C", "D", "F"] as ExecutionGrade[]).map((g) => {
                      const active = field.value === g;
                      const tone =
                        g === "A" || g === "B"
                          ? "border-profit/60 bg-profit/10 text-profit"
                          : g === "F"
                            ? "border-loss/60 bg-loss/10 text-loss"
                            : "border-border/60 bg-muted/30 text-muted-foreground";
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => field.onChange(active ? null : g)}
                          className={`grid size-10 place-items-center rounded-lg border font-mono text-sm font-semibold transition-all ${
                            active
                              ? tone
                              : "border-border/60 text-muted-foreground hover:border-border"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                  <FormDescription>
                    Grade how well you followed the plan — independent of P&L.
                    A losing A-grade trade is fine.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chart screenshots</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploader
              existing={initial?.trade_images ?? []}
              pending={pendingImages}
              onPendingChange={setPendingImages}
              userId={userId}
              tradeId={initial?.id}
            />
          </CardContent>
        </Card>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3 pb-8">
          {initial ? (
            <Button
              type="button"
              variant="outline"
              className="text-loss hover:text-loss"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 size-4" /> Delete trade
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending} size="lg">
              {pending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {initial ? "Save changes" : "Save trade"}
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this trade?</DialogTitle>
            <DialogDescription>
              This will permanently remove the trade, its notes, tags and
              chart images. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}

function EmotionPicker({
  value,
  onChange,
}: {
  value: Emotion | null;
  onChange: (v: Emotion | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EMOTIONS.map((e) => {
        const active = value === e.value;
        const tone = active
          ? e.tone === "profit"
            ? "border-profit/60 bg-profit/10 text-profit"
            : e.tone === "loss"
              ? "border-loss/60 bg-loss/10 text-loss"
              : "border-primary/50 bg-primary/10 text-primary"
          : "border-border/60 text-muted-foreground hover:border-border";
        return (
          <button
            key={e.value}
            type="button"
            onClick={() => onChange(active ? null : e.value)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${tone}`}
          >
            {e.label}
          </button>
        );
      })}
    </div>
  );
}
