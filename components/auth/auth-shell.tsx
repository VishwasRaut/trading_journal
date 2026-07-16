"use client";

import { motion } from "framer-motion";
import { LineChart, TrendingUp, ShieldCheck, Sparkles } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-radial-fade" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />

      {/* left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between p-12 lg:flex">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <LineChart className="size-5" />
          </div>
          Ledger
        </motion.div>

        <div className="max-w-md space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="font-display text-5xl leading-[1.05] tracking-[-0.035em] text-foreground"
          >
            Trade with intention. <br />
            <em className="not-italic bg-linear-to-r from-primary via-chart-5 to-profit bg-clip-text text-transparent">
              Review with clarity.
            </em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[17px] leading-relaxed text-muted-foreground"
          >
            Log every entry &amp; exit, attach the chart that convinced you,
            and let Ledger show you where the edge really is.
          </motion.p>

          <div className="grid gap-3 pt-4">
            {[
              { icon: TrendingUp, text: "Weekly & monthly P&L, at a glance" },
              { icon: Sparkles, text: "Calendar heatmap of every trading day" },
              { icon: ShieldCheck, text: "Your data, encrypted & private" },
            ].map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3 backdrop-blur"
              >
                <div className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
                  <f.icon className="size-4" />
                </div>
                <span className="text-sm">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} Ledger — a personal trading journal.
        </div>
      </div>

      {/* right form panel */}
      <div className="relative flex w-full items-center justify-center p-6 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
