"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatSigned } from "@/lib/format";
import { closedTrades } from "@/lib/analytics";
import type { TradeWithRelations } from "@/lib/trades";

type DayEntry = { pnl: number; trades: TradeWithRelations[] };

export function CalendarView({
  trades,
  currency,
}: {
  trades: TradeWithRelations[];
  currency: string;
}) {
  const [cursor, setCursor] = useState(startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, DayEntry>();
    for (const t of closedTrades(trades)) {
      const key = format(parseISO(t.exit_at ?? t.entry_at), "yyyy-MM-dd");
      const cur = map.get(key) ?? { pnl: 0, trades: [] };
      cur.pnl = round(cur.pnl + (t.pnl ?? 0));
      cur.trades.push(t);
      map.set(key, cur);
    }
    return map;
  }, [trades]);

  const maxAbs = useMemo(() => {
    let m = 1;
    for (const v of byDay.values()) m = Math.max(m, Math.abs(v.pnl));
    return m;
  }, [byDay]);

  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const monthTotal = useMemo(() => {
    let sum = 0;
    let count = 0;
    for (const d of days) {
      if (!isSameMonth(d, cursor)) continue;
      const key = format(d, "yyyy-MM-dd");
      const entry = byDay.get(key);
      if (entry) {
        sum += entry.pnl;
        count += entry.trades.length;
      }
    }
    return { sum: round(sum), count };
  }, [days, cursor, byDay]);

  const selectedKey = selected ? format(selected, "yyyy-MM-dd") : null;
  const selectedEntry = selectedKey ? byDay.get(selectedKey) : null;

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCursor((c) => addMonths(c, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="text-lg font-semibold tracking-tight">
                {format(cursor, "MMMM yyyy")}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCursor((c) => addMonths(c, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => setCursor(startOfMonth(new Date()))}
              >
                Today
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">This month:</span>{" "}
                <span
                  className={`font-medium ${
                    monthTotal.sum >= 0 ? "text-profit" : "text-loss"
                  }`}
                >
                  {formatSigned(monthTotal.sum, currency)}
                </span>
              </div>
              <div className="text-muted-foreground">
                {monthTotal.count} trade{monthTotal.count === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-xs text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-1 pb-1 text-[11px] uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d, idx) => {
              const key = format(d, "yyyy-MM-dd");
              const entry = byDay.get(key);
              const dim = !isSameMonth(d, cursor);
              const isToday = isSameDay(d, new Date());
              const intensity = entry
                ? Math.min(1, Math.abs(entry.pnl) / maxAbs)
                : 0;
              const bgColor = !entry
                ? undefined
                : entry.pnl >= 0
                  ? `color-mix(in oklch, var(--profit) ${Math.round(
                      intensity * 55 + 10,
                    )}%, transparent)`
                  : `color-mix(in oklch, var(--loss) ${Math.round(
                      intensity * 55 + 10,
                    )}%, transparent)`;

              return (
                <motion.button
                  key={key}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: dim ? 0.3 : 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.005, 0.15) }}
                  onClick={() => (entry ? setSelected(d) : null)}
                  className={`relative aspect-square rounded-lg border p-1.5 text-left transition-shadow hover:shadow-md ${
                    isToday
                      ? "border-primary/70 shadow-inner shadow-primary/10"
                      : "border-border/60"
                  } ${entry ? "cursor-pointer" : "cursor-default"}`}
                  style={{ background: bgColor }}
                  aria-label={format(d, "EEEE, MMM d")}
                >
                  <div className="text-xs font-medium">{format(d, "d")}</div>
                  {entry && (
                    <div
                      className={`absolute bottom-1 left-1 right-1 truncate text-[10px] font-semibold md:text-xs ${
                        entry.pnl >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatSigned(entry.pnl, currency)}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex items-center gap-1">
              {[0.15, 0.35, 0.55, 0.75, 0.95].map((v) => (
                <div
                  key={v}
                  className="size-3 rounded"
                  style={{
                    background: `color-mix(in oklch, var(--loss) ${Math.round(v * 100)}%, transparent)`,
                  }}
                />
              ))}
            </div>
            <span>Loss</span>
            <div className="flex items-center gap-1">
              {[0.15, 0.35, 0.55, 0.75, 0.95].map((v) => (
                <div
                  key={v}
                  className="size-3 rounded"
                  style={{
                    background: `color-mix(in oklch, var(--profit) ${Math.round(v * 100)}%, transparent)`,
                  }}
                />
              ))}
            </div>
            <span>Profit</span>
            <span className="ml-auto">More</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected && format(selected, "EEEE, MMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>
          <AnimatePresence>
            {selectedEntry && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-2"
              >
                <div
                  className={`rounded-lg p-3 text-lg font-semibold ${
                    selectedEntry.pnl >= 0
                      ? "bg-profit/15 text-profit"
                      : "bg-loss/15 text-loss"
                  }`}
                >
                  {formatSigned(selectedEntry.pnl, currency)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    · {selectedEntry.trades.length} trade
                    {selectedEntry.trades.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid gap-1.5">
                  {selectedEntry.trades.map((t) => (
                    <Link
                      key={t.id}
                      href={`/trades/${t.id}`}
                      className="flex items-center justify-between rounded-lg border border-border/60 p-2.5 text-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.symbol}</span>
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {t.market}
                        </Badge>
                      </div>
                      <span
                        className={`font-medium ${
                          (t.pnl ?? 0) >= 0 ? "text-profit" : "text-loss"
                        }`}
                      >
                        {formatSigned(t.pnl ?? 0, currency)}
                      </span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function round(n: number, d = 2) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
