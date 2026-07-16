"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImageKind, TradeImageRow } from "@/types/database";

const KIND_LABEL: Record<ImageKind, string> = {
  entry_chart: "Entry chart",
  exit_chart: "Exit chart",
  other: "Chart",
};

type ImageWithUrl = TradeImageRow & { url: string | null };

export function TradeCharts({ images }: { images: ImageWithUrl[] }) {
  const [lightbox, setLightbox] = useState<ImageWithUrl | null>(null);

  if (!images.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chart screenshots</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No chart screenshots attached to this trade.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Chart screenshots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {images.map((img) => (
              <motion.button
                key={img.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => img.url && setLightbox(img)}
                className="group overflow-hidden rounded-xl border bg-card text-left"
              >
                <div className="relative aspect-video bg-black/40">
                  {img.url ? (
                    <Image
                      src={img.url}
                      alt={img.caption ?? KIND_LABEL[img.kind]}
                      fill
                      unoptimized
                      className="object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground text-sm">
                      Image unavailable
                    </div>
                  )}
                  <div className="absolute left-3 top-3 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
                    {KIND_LABEL[img.kind]}
                  </div>
                </div>
                {img.caption && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {img.caption}
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {lightbox && lightbox.url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-6 backdrop-blur"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-background/90"
              onClick={() => setLightbox(null)}
            >
              <X className="size-5" />
            </button>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={lightbox.url}
                alt={lightbox.caption ?? ""}
                fill
                unoptimized
                className="object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
