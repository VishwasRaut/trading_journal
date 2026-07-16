"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_SYMBOLS,
  symbolsForMarket,
  findSymbol,
  type SymbolEntry,
} from "@/lib/symbols";
import type { Market } from "@/types/database";

export type PickerMarket = Market | "all";

const MARKET_LABEL: Record<PickerMarket, string> = {
  all: "All markets",
  forex: "Forex",
  crypto: "Crypto",
  equity: "Stocks / Equity",
  options: "Options",
  futures: "Futures / Commodities",
};

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function SymbolPicker({
  value,
  onChange,
  onPick,
  market,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Called with the full entry when a preset is picked (undefined for custom). */
  onPick?: (entry: SymbolEntry | undefined) => void;
  market: PickerMarket;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const symbols = useMemo(
    () => (market === "all" ? ALL_SYMBOLS : symbolsForMarket(market)),
    [market],
  );
  const isFreeText = market === "equity" || market === "options";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return symbols;
    return symbols.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q),
    );
  }, [symbols, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, SymbolEntry[]>();
    for (const s of filtered) {
      // When browsing all markets, prefix the group by the primary market
      // so the same group name (e.g. "Metals") doesn't collide across sections.
      const key =
        market === "all"
          ? `${MARKET_LABEL[s.markets[0] ?? "all"]} — ${s.group}`
          : s.group;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filtered, market]);

  const known = findSymbol(value);
  const customTrimmed = query.trim().toUpperCase();
  const showCreateCustom =
    customTrimmed.length > 0 &&
    !filtered.some((s) => s.symbol === customTrimmed);

  const flatOptions: (SymbolEntry | { custom: string })[] = useMemo(() => {
    const opts: (SymbolEntry | { custom: string })[] = [...filtered];
    if (showCreateCustom) opts.push({ custom: customTrimmed });
    return opts;
  }, [filtered, showCreateCustom, customTrimmed]);

  useEffect(() => setMounted(true), []);

  // Measure the trigger and position the popover
  useIsoLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function measure() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (
        !triggerRef.current?.contains(t) &&
        !popRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Reset active index when filtered set changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query, market]);

  function pick(opt: SymbolEntry | { custom: string }) {
    if ("custom" in opt) {
      onChange(opt.custom);
      onPick?.(undefined);
    } else {
      onChange(opt.symbol);
      onPick?.(opt);
    }
    setOpen(false);
    setQuery("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = flatOptions[activeIndex];
      if (opt) pick(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const displayValue = value || "";

  const popover =
    open && rect ? (
      <AnimatePresence>
        <motion.div
          ref={popRef}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
            zIndex: 60,
          }}
          className="overflow-hidden rounded-xl border border-border/60 bg-popover shadow-2xl shadow-black/25 ring-1 ring-foreground/5"
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder={`Search ${MARKET_LABEL[market]}...`}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {filtered.length}
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto p-1">
            {grouped.length === 0 && !showCreateCustom && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {isFreeText
                  ? "No preset symbols. Type your ticker below."
                  : "No matching symbols."}
              </div>
            )}

            {grouped.map(([group, items]) => (
              <div key={group} className="mb-1">
                <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </div>
                {items.map((item) => {
                  const idx = flatOptions.indexOf(item);
                  const active = idx === activeIndex;
                  const selected = item.symbol === value;
                  return (
                    <button
                      key={item.symbol}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => pick(item)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50",
                      )}
                    >
                      <span className="min-w-[92px] font-medium">
                        {item.symbol}
                      </span>
                      <span className="flex-1 truncate text-xs text-muted-foreground">
                        {item.name}
                      </span>
                      {selected && (
                        <Check className="size-3.5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {showCreateCustom && (
              <>
                {grouped.length > 0 && (
                  <div className="my-1 border-t border-border/60" />
                )}
                <button
                  type="button"
                  onMouseEnter={() =>
                    setActiveIndex(flatOptions.length - 1)
                  }
                  onClick={() => pick({ custom: customTrimmed })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    activeIndex === flatOptions.length - 1
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                  )}
                >
                  <Sparkles className="size-3.5 text-primary" />
                  <span>
                    Use custom symbol{" "}
                    <span className="font-medium text-foreground">
                      {customTrimmed}
                    </span>
                  </span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
            <span>↑↓ navigate · ↵ select · esc close</span>
            <span>{MARKET_LABEL[market]}</span>
          </div>
        </motion.div>
      </AnimatePresence>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "dark:bg-input/30 dark:hover:bg-input/50",
          !displayValue && "text-muted-foreground",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {displayValue ? (
            <>
              <span className="font-medium text-foreground">
                {displayValue}
              </span>
              {known && (
                <span className="truncate text-xs text-muted-foreground">
                  · {known.name}
                </span>
              )}
              {!known && displayValue && (
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                  Custom
                </span>
              )}
            </>
          ) : (
            <span>{placeholder ?? "Search or pick a symbol..."}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {mounted && popover && createPortal(popover, document.body)}
    </>
  );
}
