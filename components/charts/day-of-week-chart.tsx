"use client";

import { motion } from "framer-motion";
import { formatSigned } from "@/lib/format";
import type { dayOfWeekPnl } from "@/lib/analytics";

type Row = ReturnType<typeof dayOfWeekPnl>[number];

export function DayOfWeekChart({
  data,
  currency,
}: {
  data: Row[];
  currency: string;
}) {
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));

  return (
    <div className="grid gap-2">
      {data.map((d, i) => {
        const positive = d.pnl >= 0;
        const width = Math.abs(d.pnl) / maxAbs;
        return (
          <div key={d.day} className="grid grid-cols-[36px_1fr_auto] items-center gap-3">
            <div className="text-xs font-medium text-muted-foreground">
              {d.day}
            </div>
            <div className="relative h-6 rounded-md bg-muted/40">
              {d.count > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width * 100}%` }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.04,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`absolute inset-y-0 rounded-md ${
                    positive
                      ? "bg-linear-to-r from-profit/30 to-profit/70"
                      : "bg-linear-to-r from-loss/70 to-loss/30"
                  }`}
                  style={positive ? { left: 0 } : { right: 0 }}
                />
              )}
              <div className="relative flex h-full items-center px-2 text-[11px] text-muted-foreground">
                <span>{d.count} trade{d.count === 1 ? "" : "s"}</span>
                {d.count > 0 && (
                  <span className="ml-auto">{d.winRate.toFixed(0)}% win</span>
                )}
              </div>
            </div>
            <div
              className={`num min-w-[72px] text-right text-sm font-medium ${
                d.pnl === 0
                  ? "text-muted-foreground"
                  : positive
                    ? "text-profit"
                    : "text-loss"
              }`}
            >
              {d.count === 0 ? "—" : formatSigned(d.pnl, currency)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
