"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatSigned } from "@/lib/format";

type Row = { hour: number; pnl: number; count: number };

export function HourOfDayHeatmap({
  data,
  currency,
}: {
  data: Row[];
  currency: string;
}) {
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-12 gap-1.5">
        {data.map((d, i) => {
          const intensity = Math.min(1, Math.abs(d.pnl) / maxAbs);
          const bg =
            d.count === 0
              ? "transparent"
              : d.pnl >= 0
                ? `color-mix(in oklch, var(--profit) ${Math.round(
                    intensity * 60 + 12,
                  )}%, transparent)`
                : `color-mix(in oklch, var(--loss) ${Math.round(
                    intensity * 60 + 12,
                  )}%, transparent)`;
          return (
            <motion.div
              key={d.hour}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.01, duration: 0.2 }}
              className={cn(
                "group relative aspect-square rounded-md border border-border/40",
                d.count === 0 && "opacity-40",
              )}
              style={{ background: bg }}
              title={`${d.hour.toString().padStart(2, "0")}:00 — ${d.count} trade${
                d.count === 1 ? "" : "s"
              }, ${formatSigned(d.pnl, currency)}`}
            >
              <div className="absolute inset-0 grid place-items-center text-[10px] font-medium text-muted-foreground">
                {d.hour.toString().padStart(2, "0")}
              </div>
              {d.count > 0 && (
                <div className="pointer-events-none absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                  {d.count}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>00 · midnight</span>
        <span>12 · noon</span>
        <span>23</span>
      </div>
    </div>
  );
}
