"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, TrendingDown, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { formatSigned, formatTradeDate } from "@/lib/format";
import type { TradeWithRelations } from "@/lib/trades";
import type { Market } from "@/types/database";

const MARKET_LABEL: Record<Market, string> = {
  forex: "FX",
  crypto: "Crypto",
  equity: "Equity",
  options: "Options",
  futures: "Futures",
};

export function TradesTable({
  trades,
  currency,
}: {
  trades: TradeWithRelations[];
  currency: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "closed">("all");
  const [market, setMarket] = useState<"all" | Market>("all");

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (market !== "all" && t.market !== market) return false;
      if (query) {
        const q = query.toLowerCase();
        const inSymbol = t.symbol.toLowerCase().includes(q);
        const inStrat = (t.strategy ?? "").toLowerCase().includes(q);
        const inTag = t.trade_tags?.some((tg) =>
          tg.tag.toLowerCase().includes(q),
        );
        if (!inSymbol && !inStrat && !inTag) return false;
      }
      return true;
    });
  }, [trades, query, status, market]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol, strategy or tag..."
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={market} onValueChange={(v) => setMarket(v as typeof market)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All markets</SelectItem>
            {Object.entries(MARKET_LABEL).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-muted-foreground">
            {trades.length === 0
              ? "No trades yet. Log your first trade to get started."
              : "No trades match those filters."}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t, i) => (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                  className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted"
                >
                  <TableCell className="font-medium">
                    <Link href={`/trades/${t.id}`} className="hover:underline">
                      {t.symbol}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{MARKET_LABEL[t.market]}</Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                        t.direction === "long"
                          ? "bg-profit/15 text-profit"
                          : "bg-loss/15 text-loss"
                      }`}
                    >
                      {t.direction === "long" ? (
                        <TrendingUp className="size-3" />
                      ) : (
                        <TrendingDown className="size-3" />
                      )}
                      {t.direction}
                    </span>
                  </TableCell>
                  <TableCell className="num">{t.entry_price}</TableCell>
                  <TableCell className="num">{t.exit_price ?? "—"}</TableCell>
                  <TableCell>
                    {t.pnl !== null ? (
                      <span
                        className={`num font-medium ${
                          t.pnl >= 0 ? "text-profit" : "text-loss"
                        }`}
                      >
                        {formatSigned(t.pnl, currency)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={t.status === "open" ? "outline" : "default"}
                      className="capitalize"
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatTradeDate(t.entry_at)}
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
