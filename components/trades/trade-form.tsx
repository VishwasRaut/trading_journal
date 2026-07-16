"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Save, Trash2, TrendingDown, TrendingUp } from "lucide-react";

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
import {
  defaultContractSize,
  findSymbol,
  sizeFieldLabel,
} from "@/lib/symbols";
import type { TradeWithRelations } from "@/lib/trades";
import type { Market, TradingAccountRow } from "@/types/database";

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
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function dateStringToIso(value: string) {
  // Parse `YYYY-MM-DD` as local midnight so the day matches what the user picked,
  // regardless of timezone (a plain `new Date("YYYY-MM-DD")` would parse as UTC).
  return new Date(`${value}T00:00:00`).toISOString();
}

export function TradeForm({
  userId,
  initial,
  accounts,
  defaultAccountId,
}: {
  userId: string;
  initial?: TradeWithRelations | null;
  accounts: TradingAccountRow[];
  defaultAccountId: string;
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
      const isClosed = !!values.exit_price && !!values.exit_at;
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
        status: (isClosed ? "closed" : "open") as "open" | "closed",
        pnl,
        pnl_percent: pnl_pct,
        fees: values.fees,
        stop_loss: values.stop_loss ?? null,
        take_profit: values.take_profit ?? null,
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
              name="mistakes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mistakes / lessons</FormLabel>
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
