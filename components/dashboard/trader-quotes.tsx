"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type QuoteEntry = { text: string; author: string };

const QUOTES: QuoteEntry[] = [
  {
    text: "The goal of a successful trader is to make the best trades. Money is secondary.",
    author: "Alexander Elder",
  },
  {
    text: "Cut your losses short and let your winners run.",
    author: "Ed Seykota",
  },
  {
    text: "The stock market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett",
  },
  {
    text: "Amateurs think about how much money they can make. Professionals think about how much money they could lose.",
    author: "Jack Schwager",
  },
  {
    text: "Every day I assume every position I have is wrong.",
    author: "Paul Tudor Jones",
  },
  {
    text: "The four most dangerous words in investing are: this time it's different.",
    author: "Sir John Templeton",
  },
  {
    text: "The market can remain irrational longer than you can remain solvent.",
    author: "John Maynard Keynes",
  },
  {
    text: "It's not whether you're right or wrong, but how much you make when right and how much you lose when wrong.",
    author: "George Soros",
  },
  {
    text: "The most important quality for an investor is temperament, not intellect.",
    author: "Warren Buffett",
  },
  {
    text: "Risk comes from not knowing what you're doing.",
    author: "Warren Buffett",
  },
  {
    text: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
  },
  {
    text: "In investing, what is comfortable is rarely profitable.",
    author: "Robert Arnott",
  },
  {
    text: "The trend is your friend until the end when it bends.",
    author: "Ed Seykota",
  },
  {
    text: "The best traders have no ego. You have to swallow your mistakes and move on.",
    author: "Tom Baldwin",
  },
  {
    text: "Losers average losers.",
    author: "Paul Tudor Jones",
  },
  {
    text: "The way to build wealth is to preserve capital and wait patiently for the right opportunity.",
    author: "Victor Sperandeo",
  },
  {
    text: "I'm always thinking about losing money as opposed to making money.",
    author: "Paul Tudor Jones",
  },
  {
    text: "Trade the market you have, not the market you want.",
    author: "Anonymous",
  },
  {
    text: "You get recessions, you have stock market declines. If you don't understand that's going to happen, then you're not ready — you won't do well in the markets.",
    author: "Peter Lynch",
  },
  {
    text: "Plan the trade and trade the plan.",
    author: "Anonymous",
  },
];

/**
 * Rotating trader-mindset quotes for the dashboard.
 * Default is every 6 seconds — long enough to actually read the quote.
 * Pass `intervalMs={2000}` (or any value) if you want a faster rotation.
 */
export function TraderQuotes({
  intervalMs = 6000,
}: {
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * QUOTES.length));
  }, []);

  useEffect(() => {
    const t = setInterval(
      () => setIndex((i) => (i + 1) % QUOTES.length),
      intervalMs,
    );
    return () => clearInterval(t);
  }, [intervalMs]);

  const q = QUOTES[index];

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-primary/8 via-transparent to-chart-5/8" />
      <CardContent className="relative flex items-center gap-4 p-4 md:p-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
          <Quote className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="grid gap-1"
            >
              <p className="text-[15px] font-medium leading-snug tracking-tight text-foreground md:text-base">
                &ldquo;{q.text}&rdquo;
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                — {q.author}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="hidden shrink-0 items-center gap-1 md:flex">
          {QUOTES.slice(0, 5).map((_, i) => {
            const active = i === index % 5;
            return (
              <motion.span
                key={i}
                className="block h-1 rounded-full bg-primary/30"
                animate={{
                  width: active ? 20 : 6,
                  backgroundColor: active
                    ? "var(--primary)"
                    : "color-mix(in oklch, var(--primary) 30%, transparent)",
                }}
                transition={{ duration: 0.3 }}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
