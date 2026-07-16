"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { ImageKind, TradeImageRow } from "@/types/database";

export type PendingImage = {
  id: string;
  file: File;
  preview: string;
  kind: ImageKind;
  caption: string;
};

const KIND_LABEL: Record<ImageKind, string> = {
  entry_chart: "Entry chart",
  exit_chart: "Exit chart",
  other: "Other",
};

export function ImageUploader({
  existing,
  pending,
  onPendingChange,
  userId,
  tradeId,
}: {
  existing: TradeImageRow[];
  pending: PendingImage[];
  onPendingChange: (imgs: PendingImage[]) => void;
  userId: string;
  tradeId?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!existing.length) return;
      const supabase = createClient();
      const map: Record<string, string> = {};
      for (const img of existing) {
        const { data } = await supabase.storage
          .from("trade-charts")
          .createSignedUrl(img.storage_path, 60 * 60);
        if (data?.signedUrl) map[img.id] = data.signedUrl;
      }
      if (mounted) setSignedUrls(map);
    })();
    return () => {
      mounted = false;
    };
  }, [existing]);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const additions: PendingImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} is over 8MB`);
          continue;
        }
        additions.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          kind:
            pending.length === 0 && existing.length === 0
              ? "entry_chart"
              : "other",
          caption: "",
        });
      }
      onPendingChange([...pending, ...additions]);
    },
    [pending, existing.length, onPendingChange],
  );

  function removePending(id: string) {
    const item = pending.find((p) => p.id === id);
    if (item) URL.revokeObjectURL(item.preview);
    onPendingChange(pending.filter((p) => p.id !== id));
  }

  async function deleteExisting(img: TradeImageRow) {
    if (!confirm("Delete this chart?")) return;
    setDeleting(img.id);
    const supabase = createClient();
    await supabase.storage.from("trade-charts").remove([img.storage_path]);
    const { error } = await supabase
      .from("trade_images")
      .delete()
      .eq("id", img.id);
    setDeleting(null);
    if (error) return toast.error(error.message);
    toast.success("Chart deleted");
    // Optimistic: hide it
    setSignedUrls((m) => {
      const next = { ...m };
      delete next[img.id];
      return next;
    });
  }

  const _unused = { userId, tradeId }; // reserved for future direct-upload path
  void _unused;

  return (
    <div className="grid gap-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border/60 hover:border-border"
        }`}
      >
        <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <ImagePlus className="size-6" />
        </div>
        <div className="text-sm font-medium">
          Drop chart screenshots here, or click to browse
        </div>
        <div className="text-xs text-muted-foreground">
          PNG, JPG, WebP · up to 8MB each
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </label>

      {(pending.length > 0 || existing.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence>
            {pending.map((img) => (
              <motion.div
                key={img.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="overflow-hidden rounded-xl border bg-card"
              >
                <div className="relative aspect-video bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePending(img.id)}
                    className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/80 backdrop-blur hover:bg-background"
                  >
                    <X className="size-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
                    Pending
                  </div>
                </div>
                <div className="grid gap-2 p-3">
                  <Select
                    value={img.kind}
                    onValueChange={(v) => {
                      onPendingChange(
                        pending.map((p) =>
                          p.id === img.id ? { ...p, kind: v as ImageKind } : p,
                        ),
                      );
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(KIND_LABEL).map(([v, label]) => (
                        <SelectItem key={v} value={v}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Caption (optional)"
                    value={img.caption}
                    onChange={(e) =>
                      onPendingChange(
                        pending.map((p) =>
                          p.id === img.id
                            ? { ...p, caption: e.target.value }
                            : p,
                        ),
                      )
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </motion.div>
            ))}
            {existing.map((img) => (
              <motion.div
                key={img.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="overflow-hidden rounded-xl border bg-card"
              >
                <div className="relative aspect-video bg-black/40">
                  {signedUrls[img.id] ? (
                    <Image
                      src={signedUrls[img.id]}
                      alt={img.caption ?? ""}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    disabled={deleting === img.id}
                    onClick={() => deleteExisting(img)}
                    className="absolute right-2 top-2 size-8"
                  >
                    {deleting === img.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <X className="size-4" />
                    )}
                  </Button>
                </div>
                <div className="grid gap-1 p-3 text-xs">
                  <div className="font-medium">{KIND_LABEL[img.kind]}</div>
                  {img.caption && (
                    <div className="text-muted-foreground">{img.caption}</div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
