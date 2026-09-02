"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import {
  playbookFormSchema,
  type PlaybookFormValues,
} from "@/lib/schemas";
import { savePlaybook } from "@/app/(app)/actions/playbook";
import type { PlaybookRow, PlaybookChecklistItem } from "@/types/database";

const DEFAULT_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#eab308",
];

function newChecklistItem(label = ""): PlaybookChecklistItem {
  return { id: crypto.randomUUID(), label };
}

export function PlaybookForm({
  initial,
  onDone,
}: {
  initial?: PlaybookRow | null;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const form = useForm<PlaybookFormValues>({
    resolver: zodResolver(playbookFormSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          description: initial.description ?? "",
          color: initial.color ?? DEFAULT_COLORS[0],
          target_r_multiple: initial.target_r_multiple ?? undefined,
          checklist: initial.checklist ?? [],
        }
      : {
          name: "",
          description: "",
          color: DEFAULT_COLORS[0],
          target_r_multiple: undefined,
          checklist: [newChecklistItem("")],
        },
  });

  const [items, setItems] = useState<PlaybookChecklistItem[]>(
    form.getValues("checklist") ?? [],
  );

  function updateItems(next: PlaybookChecklistItem[]) {
    setItems(next);
    form.setValue("checklist", next, { shouldDirty: true });
  }

  function onSubmit(values: PlaybookFormValues) {
    // Drop empty checklist rows so trailing blanks don't get saved.
    const checklist = values.checklist.filter((c) => c.label.trim() !== "");
    startTransition(async () => {
      const res = await savePlaybook({
        id: initial?.id,
        name: values.name,
        description: values.description ?? null,
        color: values.color ?? null,
        target_r_multiple: values.target_r_multiple ?? null,
        checklist,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(initial ? "Playbook updated" : "Playbook saved");
      onDone?.();
    });
  }

  const color = form.watch("color") ?? DEFAULT_COLORS[0];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setup name</FormLabel>
              <FormControl>
                <Input
                  placeholder="A+ Breakout Retest"
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What defines this setup?</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Higher-timeframe trend, clean breakout, retest of the level with rejection candle..."
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="target_r_multiple"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target R:R</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="2.0"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                </FormControl>
                <FormDescription>
                  Analytics compares your actual R to this to flag setups where
                  you keep exiting early.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <div className="flex items-center gap-2">
                  <div
                    className="size-8 shrink-0 rounded-md border border-border/60"
                    style={{ background: color }}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => field.onChange(c)}
                        className={`size-6 rounded-md border-2 transition-transform hover:scale-110 ${
                          field.value === c
                            ? "border-foreground"
                            : "border-transparent"
                        }`}
                        style={{ background: c }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <FormLabel>Rule checklist</FormLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateItems([...items, newChecklistItem("")])}
            >
              <Plus className="mr-1 size-3.5" /> Add rule
            </Button>
          </div>
          <FormDescription className="mb-3">
            These items appear as checkboxes on the trade form. Trades track
            which rules you followed — feeding execution quality analytics.
          </FormDescription>
          <div className="grid gap-2">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 p-2"
              >
                <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  value={item.label}
                  placeholder={`Rule ${idx + 1}`}
                  onChange={(e) => {
                    const next = items.slice();
                    next[idx] = { ...next[idx], label: e.target.value };
                    updateItems(next);
                  }}
                  className="border-none bg-transparent px-1 focus-visible:ring-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateItems(items.filter((x) => x.id !== item.id))
                  }
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No rules yet. Add at least one to make execution scoring useful.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {onDone && (
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {initial ? "Save changes" : "Create playbook"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
