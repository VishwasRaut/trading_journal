import type { Direction, Market } from "@/types/database";

export type ParsedTrade = {
  externalId: string;
  symbol: string;
  direction: Direction;
  volume: number; // lots
  entryPrice: number;
  exitPrice: number;
  entryAt: string; // ISO
  exitAt: string; // ISO
  stopLoss: number | null;
  takeProfit: number | null;
  commission: number;
  swap: number;
  fees: number; // commission + swap combined
  pnl: number;
  comment: string | null;
  /** Best-guess market classification (used when creating the trade row). */
  market: Market;
};

export type ParseResult = {
  trades: ParsedTrade[];
  /** Rows we saw but couldn't confidently parse (for the "skipped" counter). */
  skipped: number;
  /** Non-fatal warnings shown in the preview UI. */
  warnings: string[];
};

// --------------------------------------------------------------------
// Public entry point — auto-detects HTML vs CSV / tab-separated.
// --------------------------------------------------------------------
export function parseMT5Statement(raw: string): ParseResult {
  const trimmed = raw.trimStart();
  if (
    trimmed.startsWith("<") ||
    /<html|<table/i.test(trimmed.slice(0, 500))
  ) {
    return parseHtml(raw);
  }
  return parseCsvOrTsv(raw);
}

// --------------------------------------------------------------------
// HTML parsing — browser-only (uses DOMParser)
// --------------------------------------------------------------------
function parseHtml(html: string): ParseResult {
  if (typeof DOMParser === "undefined") {
    return {
      trades: [],
      skipped: 0,
      warnings: ["HTML parsing must run in the browser."],
    };
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = Array.from(doc.querySelectorAll("tr"));
  return parseRows(
    rows.map((r) =>
      Array.from(r.querySelectorAll("td,th")).map((c) =>
        (c.textContent ?? "").replace(/\s+/g, " ").trim(),
      ),
    ),
  );
}

// --------------------------------------------------------------------
// CSV / TSV parsing
// --------------------------------------------------------------------
function parseCsvOrTsv(text: string): ParseResult {
  // Detect delimiter by counting occurrences on the header-ish first data lines.
  const sample = text.split(/\r?\n/).slice(0, 15).join("\n");
  const commaCount = (sample.match(/,/g) ?? []).length;
  const tabCount = (sample.match(/\t/g) ?? []).length;
  const semiCount = (sample.match(/;/g) ?? []).length;
  const delim =
    tabCount >= commaCount && tabCount >= semiCount
      ? "\t"
      : semiCount > commaCount
        ? ";"
        : ",";

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = lines.map((l) => splitCsv(l, delim));
  return parseRows(rows);
}

function splitCsv(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === delim && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

// --------------------------------------------------------------------
// Shared row → trade logic
// --------------------------------------------------------------------
function parseRows(rows: string[][]): ParseResult {
  const trades: ParsedTrade[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  const seen = new Set<string>();

  for (const row of rows) {
    if (row.length < 8) continue;

    // Locate the "buy"/"sell" cell — the anchor for MT5 closed-position rows.
    const typeIdx = row.findIndex((c) =>
      /^(buy|sell|balance|deposit|withdrawal)$/i.test(c),
    );
    if (typeIdx === -1) continue;
    const typeCell = row[typeIdx].toLowerCase();

    // Skip balance / deposit / withdrawal lines.
    if (typeCell === "balance" || typeCell === "deposit" || typeCell === "withdrawal") {
      continue;
    }

    // Find date/time cells in this row.
    const dateIdxs: number[] = [];
    row.forEach((c, i) => {
      if (isMt5DateTime(c)) dateIdxs.push(i);
    });
    if (dateIdxs.length < 2) {
      // Might be an open position (no exit) — skip for now.
      continue;
    }

    const entryDateIdx = dateIdxs[0];
    const exitDateIdx = dateIdxs[dateIdxs.length - 1];

    // Position / order id — usually a purely-numeric cell right after the entry time
    // OR immediately before the symbol cell. Search a small window.
    const idIdx = findIdCell(row, entryDateIdx, typeIdx);

    // Symbol — non-numeric alphabetical cell close to type.
    const symbolIdx = findSymbolCell(row, typeIdx);
    if (symbolIdx === -1) {
      skipped++;
      continue;
    }

    // Numeric cells after the type cell — these are volume, prices, sl, tp,
    // commission, swap, profit in some order. We take positional guesses that
    // match the canonical MT5 layout:
    //   entry_time | position | symbol | type | volume | entry_price |
    //     s/l | t/p | exit_time | exit_price | commission | swap | profit
    // If the layout is different we'll still often be right because the
    // meaningful numeric cells appear in the same order.
    const numeric = row
      .map((c, i) => ({ i, v: parseNum(c) }))
      .filter((x) => x.v !== null && x.i !== typeIdx && x.i !== symbolIdx);

    // The first numeric after typeIdx is volume; then entry price, sl, tp,
    // then exit price, commission, swap, profit.
    const afterType = numeric.filter((x) => x.i > typeIdx);
    if (afterType.length < 4) {
      skipped++;
      continue;
    }

    const volume = afterType[0].v!;
    const entryPrice = afterType[1].v!;
    // sl/tp are the next two but may be zero (meaning "not set")
    const stopLoss = afterType[2]?.v ?? null;
    const takeProfit = afterType[3]?.v ?? null;
    // exit price is the next non-zero-ish price after the exit-time cell
    const exitPrice =
      numeric.find((x) => x.i > exitDateIdx && x.v && x.v > 0)?.v ?? null;
    // Profit is almost always the LAST numeric cell.
    const pnl = afterType[afterType.length - 1].v!;
    // Commission and swap are the two cells immediately before profit.
    const commission = afterType[afterType.length - 3]?.v ?? 0;
    const swap = afterType[afterType.length - 2]?.v ?? 0;

    if (!exitPrice) {
      skipped++;
      continue;
    }

    const externalId =
      idIdx !== -1 ? row[idIdx] : synthId(row[entryDateIdx], row[symbolIdx]);
    if (seen.has(externalId)) continue;
    seen.add(externalId);

    const symbol = row[symbolIdx].toUpperCase();

    trades.push({
      externalId,
      symbol,
      direction: typeCell === "buy" ? "long" : "short",
      volume,
      entryPrice,
      exitPrice,
      entryAt: mt5DateToIso(row[entryDateIdx]),
      exitAt: mt5DateToIso(row[exitDateIdx]),
      stopLoss: stopLoss && stopLoss > 0 ? stopLoss : null,
      takeProfit: takeProfit && takeProfit > 0 ? takeProfit : null,
      commission,
      swap,
      fees: round(Math.abs(commission) + Math.abs(swap)),
      pnl,
      comment: null,
      market: guessMarket(symbol),
    });
  }

  if (trades.length === 0 && skipped === 0) {
    warnings.push(
      "No closed trades found. Make sure this is a MetaTrader 5 Detailed Statement (HTML) or CSV export.",
    );
  }

  return { trades, skipped, warnings };
}

// --------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------
function isMt5DateTime(s: string): boolean {
  // 2024.01.15 10:32:15   OR   2024-01-15 10:32:15
  return /^\d{4}[.\-/]\d{2}[.\-/]\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s);
}

function mt5DateToIso(s: string): string {
  // Assume local time — the broker's server usually reports in a specific TZ,
  // but without a reliable TZ marker we treat the timestamp as-is.
  const normalised = s
    .replace(/\./g, "-")
    .replace(/\//g, "-")
    .replace(" ", "T");
  const withSeconds = /:\d{2}$/.test(normalised)
    ? normalised
    : `${normalised}:00`;
  return new Date(withSeconds).toISOString();
}

function parseNum(s: string): number | null {
  if (!s) return null;
  // MT5 uses space as thousand separator in some locales.
  const cleaned = s.replace(/\s/g, "").replace(/,/g, ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function findIdCell(row: string[], entryDateIdx: number, typeIdx: number): number {
  // A pure-integer cell of 6+ digits between the entry-date and the type cell.
  for (let i = entryDateIdx + 1; i < typeIdx && i < row.length; i++) {
    if (/^\d{6,}$/.test(row[i])) return i;
  }
  // Fallback: anywhere in the first few cells.
  for (let i = 0; i < Math.min(row.length, 4); i++) {
    if (/^\d{6,}$/.test(row[i])) return i;
  }
  return -1;
}

function findSymbolCell(row: string[], typeIdx: number): number {
  // Search a window around typeIdx for a symbol-looking cell.
  for (let i = typeIdx - 1; i >= Math.max(0, typeIdx - 3); i--) {
    if (isSymbolLike(row[i])) return i;
  }
  for (let i = typeIdx + 1; i < Math.min(row.length, typeIdx + 3); i++) {
    if (isSymbolLike(row[i])) return i;
  }
  return -1;
}

function isSymbolLike(s: string): boolean {
  if (!s) return false;
  if (isMt5DateTime(s)) return false;
  // Between 2 and 12 chars, mostly letters/digits (allow slashes for FX crosses).
  return /^[A-Z0-9._\-\/]{2,12}$/i.test(s) && /[A-Z]/i.test(s);
}

function synthId(entryDate: string, symbol: string): string {
  return `mt5:${symbol.toUpperCase()}:${entryDate}`;
}

function guessMarket(symbol: string): Market {
  const s = symbol.toUpperCase();
  if (/^(XAU|XAG|XPT|XPD)/.test(s)) return "forex";
  if (
    /^[A-Z]{3}[A-Z]{3}$/.test(s) ||
    /^(EUR|USD|GBP|AUD|NZD|CAD|CHF|JPY)/.test(s)
  ) {
    return "forex";
  }
  if (/USDT$|USD$|BTC$|ETH$/.test(s) && /^(BTC|ETH|SOL|XRP|BNB|ADA|DOGE|SHIB|LTC|BCH|MATIC|ARB|OP|AVAX|LINK|DOT|TRX|TON|ATOM)/.test(s)) {
    return "crypto";
  }
  return "futures";
}

function round(n: number, d = 2) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
