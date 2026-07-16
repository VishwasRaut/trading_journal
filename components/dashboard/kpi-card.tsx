"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { formatSigned, formatCurrency } from "@/lib/format";

export type KpiFormat =
  | { kind: "signed"; currency?: string }
  | { kind: "currency"; currency?: string }
  | { kind: "percent"; digits?: number }
  | { kind: "number"; digits?: number };

function render(value: number, fmt: KpiFormat): string {
  switch (fmt.kind) {
    case "signed":
      return formatSigned(value, fmt.currency ?? "USD");
    case "currency":
      return formatCurrency(value, fmt.currency ?? "USD");
    case "percent": {
      const sign = value > 0 ? "+" : "";
      return `${sign}${value.toFixed(fmt.digits ?? 1)}%`;
    }
    case "number":
      return value.toFixed(fmt.digits ?? 2);
  }
}

export function KpiCard({
  label,
  value,
  format,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: number;
  format: KpiFormat;
  hint?: string;
  tone?: "neutral" | "profit" | "loss" | "primary";
  icon?: React.ReactNode;
}) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => render(v, format));

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [mv, value]);

  const toneClass =
    tone === "profit"
      ? "text-profit"
      : tone === "loss"
        ? "text-loss"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";

  const glow =
    tone === "profit"
      ? "from-profit/20"
      : tone === "loss"
        ? "from-loss/20"
        : "from-primary/20";

  return (
    <Card className="relative overflow-hidden">
      <div
        className={`pointer-events-none absolute inset-0 bg-linear-to-br ${glow} via-transparent to-transparent`}
      />
      <div className="relative flex items-start justify-between gap-3 p-5">
        <div className="grid gap-1.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </div>
          <motion.div
            className={`num text-[26px] font-semibold leading-none tracking-tight md:text-[30px] ${toneClass}`}
          >
            {display}
          </motion.div>
          {hint && (
            <div className="text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
        {icon && (
          <div className={`grid size-10 place-items-center rounded-xl bg-primary/10 ${toneClass}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
