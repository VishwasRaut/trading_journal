"use client";

import { useMemo, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatSigned } from "@/lib/format";

export type DayStats = {
  pnl: number;
  count: number;
  wins: number;
  losses: number;
};

/**
 * Map of YYYY-MM-DD → DayStats for closed trades. Missing days are treated
 * as flat ($0, 0 trades) — the user can still scroll onto them.
 */
export type DailyPnlMap = Record<string, DayStats>;

const EMPTY: DayStats = { pnl: 0, count: 0, wins: 0, losses: 0 };

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Subtract N days from a YYYY-MM-DD key, returning a new YYYY-MM-DD key. */
function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(iso: string): string {
  if (iso === todayKey()) return "Today";
  if (iso === shiftDay(todayKey(), -1)) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00.000Z`));
}

export function DailyPnlCard({
  dailyMap,
  currency,
}: {
  dailyMap: DailyPnlMap;
  currency: string;
}) {
  const [dateKey, setDateKey] = useState<string>(todayKey);

  const stats = useMemo(() => dailyMap[dateKey] ?? EMPTY, [dailyMap, dateKey]);
  const isToday = dateKey === todayKey();

  const mv = useMotionValue(stats.pnl);
  const display = useTransform(mv, (v) => formatSigned(v, currency));

  useEffect(() => {
    const controls = animate(mv, stats.pnl, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [mv, stats.pnl]);

  const tone =
    stats.pnl > 0 ? "text-profit" : stats.pnl < 0 ? "text-loss" : "text-foreground";
  const glow =
    stats.pnl > 0
      ? "from-profit/20"
      : stats.pnl < 0
        ? "from-loss/20"
        : "from-primary/20";

  const hint =
    stats.count === 0
      ? "no trades closed"
      : `${stats.count} trade${stats.count === 1 ? "" : "s"} · ${stats.wins}W · ${stats.losses}L`;

  function goPrev() {
    setDateKey((k) => shiftDay(k, -1));
  }
  function goNext() {
    setDateKey((k) => (k === todayKey() ? k : shiftDay(k, 1)));
  }

  return (
    <Card className="relative overflow-hidden">
      <div
        className={`pointer-events-none absolute inset-0 bg-linear-to-br ${glow} via-transparent to-transparent`}
      />
      <div className="relative flex items-start justify-between gap-3 p-5">
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {formatDayLabel(dateKey)}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous day"
                className="grid size-5 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={isToday}
                aria-label="Next day"
                className="grid size-5 place-items-center rounded-sm text-muted-foreground transition-colors enabled:hover:bg-muted/60 enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
          <motion.div
            className={`num text-[26px] font-semibold leading-none tracking-tight md:text-[30px] ${tone}`}
          >
            {display}
          </motion.div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        <div className={`grid size-10 place-items-center rounded-xl bg-primary/10 ${tone}`}>
          <CalendarClock className="size-5" />
        </div>
      </div>
    </Card>
  );
}
