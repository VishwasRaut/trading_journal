"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Save,
  Trash2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  saveJournalEntry,
  deleteJournalEntry,
} from "@/app/(app)/actions/journal";
import { formatSigned } from "@/lib/format";
import type {
  Emotion,
  JournalEntryKind,
  JournalEntryRow,
} from "@/types/database";

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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00.000Z");
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function JournalView({
  entries,
  dailyPnlByDate,
  currency,
}: {
  entries: JournalEntryRow[];
  dailyPnlByDate: Record<string, { pnl: number; count: number }>;
  currency: string;
}) {
  const [kind, setKind] = useState<JournalEntryKind>("daily");
  const [date, setDate] = useState<string>(today());

  const byKey = useMemo(() => {
    const m = new Map<string, JournalEntryRow>();
    for (const e of entries) m.set(`${e.kind}-${e.entry_date}`, e);
    return m;
  }, [entries]);

  const current = byKey.get(`${kind}-${date}`) ?? null;
  const dayStats = dailyPnlByDate[date];

  return (
    <div className="grid gap-6">
      <Tabs value={kind} onValueChange={(v) => setKind(v as JournalEntryKind)}>
        <TabsList>
          <TabsTrigger value="daily">Daily journal</TabsTrigger>
          <TabsTrigger value="weekly">Weekly review</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDate((d) => shiftDate(d, kind === "daily" ? -1 : -7))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="grid flex-1 gap-0.5 text-center">
            <div className="text-sm font-semibold">{fmtDate(date)}</div>
            {kind === "daily" && dayStats && (
              <div
                className={`text-xs num tabular-nums ${
                  dayStats.pnl >= 0 ? "text-profit" : "text-loss"
                }`}
              >
                {formatSigned(dayStats.pnl, currency)} · {dayStats.count} trades
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDate((d) => shiftDate(d, kind === "daily" ? 1 : 7))}
            disabled={date >= today()}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDate(today())}
          >
            Today
          </Button>
        </div>

        <TabsContent value="daily" className="mt-4">
          <JournalForm
            key={`daily-${date}`}
            kind="daily"
            date={date}
            initial={current}
          />
        </TabsContent>
        <TabsContent value="weekly" className="mt-4">
          <JournalForm
            key={`weekly-${date}`}
            kind="weekly"
            date={date}
            initial={current}
          />
        </TabsContent>
      </Tabs>

      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <NotebookPen className="size-4 text-primary" /> Recent entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {entries.slice(0, 10).map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setKind(e.kind);
                    setDate(e.entry_date);
                  }}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-border/40 px-3 py-2 text-left text-sm hover:bg-muted/40"
                >
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {e.kind}
                  </Badge>
                  <span>{fmtDate(e.entry_date)}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.mood ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function JournalForm({
  kind,
  date,
  initial,
}: {
  kind: JournalEntryKind;
  date: string;
  initial: JournalEntryRow | null;
}) {
  const [mood, setMood] = useState<Emotion | null>(initial?.mood ?? null);
  const [conditions, setConditions] = useState(
    initial?.market_conditions ?? "",
  );
  const [good, setGood] = useState(initial?.what_went_well ?? "");
  const [bad, setBad] = useState(initial?.what_went_wrong ?? "");
  const [lessons, setLessons] = useState(initial?.lessons ?? "");
  const [focus, setFocus] = useState(initial?.focus_tomorrow ?? "");
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
    };
  }

  function save() {
    startTransition(async () => {
      const res = await saveJournalEntry({
        kind,
        entry_date: date,
        mood,
        market_conditions: conditions.trim() || null,
        what_went_well: good.trim() || null,
        what_went_wrong: bad.trim() || null,
        lessons: lessons.trim() || null,
        focus_tomorrow: focus.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Saved");
      setDirty(false);
    });
  }

  function remove() {
    if (!initial) return;
    startTransition(async () => {
      const res = await deleteJournalEntry(initial.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Deleted");
      setMood(null);
      setConditions("");
      setGood("");
      setBad("");
      setLessons("");
      setFocus("");
      setDirty(false);
    });
  }

  const promptOverride: Partial<
    Record<
      "conditions" | "good" | "bad" | "lessons" | "focus",
      string
    >
  > = kind === "weekly"
    ? {
        conditions: "How was the market this week? Trend, volatility, catalysts.",
        good: "What worked this week? Best trades, best decisions.",
        bad: "What didn't? Where did I break process?",
        lessons: "What's the single biggest takeaway?",
        focus: "One area to improve next week.",
      }
    : {};

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle>
            {kind === "daily" ? "Daily reflection" : "Weekly review"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Mood
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EMOTIONS.map((e) => {
                const active = mood === e.value;
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
                    onClick={() => {
                      setMood(active ? null : e.value);
                      setDirty(true);
                    }}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${tone}`}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Market conditions">
            <Textarea
              rows={2}
              placeholder={
                promptOverride.conditions ?? "Trend, volatility, news?"
              }
              value={conditions}
              onChange={(e) => markDirty(setConditions)(e.target.value)}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="What went well">
              <Textarea
                rows={4}
                placeholder={
                  promptOverride.good ??
                  "Trades I followed my plan on, discipline wins."
                }
                value={good}
                onChange={(e) => markDirty(setGood)(e.target.value)}
              />
            </Field>
            <Field label="What went wrong">
              <Textarea
                rows={4}
                placeholder={
                  promptOverride.bad ??
                  "Where I broke process, chased, oversized."
                }
                value={bad}
                onChange={(e) => markDirty(setBad)(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Lesson">
            <Textarea
              rows={2}
              placeholder={
                promptOverride.lessons ??
                "One sentence takeaway I want to remember."
              }
              value={lessons}
              onChange={(e) => markDirty(setLessons)(e.target.value)}
            />
          </Field>

          <Field
            label={
              kind === "daily" ? "Focus tomorrow" : "Focus next week"
            }
          >
            <Textarea
              rows={2}
              placeholder={
                promptOverride.focus ??
                "The single thing I'll focus on."
              }
              value={focus}
              onChange={(e) => markDirty(setFocus)(e.target.value)}
            />
          </Field>

          <div className="flex items-center justify-between pt-1">
            {initial ? (
              <Button
                type="button"
                variant="ghost"
                className="text-loss hover:text-loss"
                onClick={remove}
              >
                <Trash2 className="mr-2 size-4" /> Delete entry
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={save} disabled={pending || !dirty}>
              {pending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {initial ? "Save changes" : "Save entry"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}
