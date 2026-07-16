import type { Market } from "@/types/database";

export type SymbolEntry = {
  symbol: string;
  name: string;
  group: string;
  /** Markets this symbol should appear under. */
  markets: Market[];
  /**
   * How many base units are in "1 lot" or "1 contract" for this instrument.
   *   FX pair standard lot   → 100,000 base units
   *   Spot Gold (XAUUSD)      → 100 troy ounces
   *   Spot Silver (XAGUSD)    → 5,000 troy ounces
   *   ES (S&P 500 futures)    → $50 / index point
   *   CL (WTI Crude futures)  → 1,000 barrels
   *   Crypto/Equity           → 1 (user enters direct units)
   * Used by the P&L calculator: position_value = lots × contract_size
   */
  contractSize: number;
  /** Human hint about what to enter. */
  sizeUnit?: string;
};

// ------------------------------------------------------------------
// Helpers to reduce boilerplate
// ------------------------------------------------------------------
type PartialEntry = Omit<SymbolEntry, "markets" | "contractSize"> & {
  markets?: Market[];
  contractSize?: number;
};

function fx(entries: PartialEntry[]): SymbolEntry[] {
  return entries.map((e) => ({
    ...e,
    markets: e.markets ?? ["forex"],
    contractSize: e.contractSize ?? 100_000,
    sizeUnit: e.sizeUnit ?? "lots (1.00 = 100,000 units)",
  }));
}

function metal(
  symbol: string,
  name: string,
  contractSize: number,
): SymbolEntry {
  return {
    symbol,
    name,
    group: "Metals (Spot)",
    markets: ["forex"],
    contractSize,
    sizeUnit: `lots (1.00 = ${contractSize} oz)`,
  };
}

function cx(entries: PartialEntry[]): SymbolEntry[] {
  return entries.map((e) => ({
    ...e,
    markets: e.markets ?? ["crypto"],
    contractSize: e.contractSize ?? 1,
    sizeUnit: e.sizeUnit ?? "coins",
  }));
}

function future(
  symbol: string,
  name: string,
  group: string,
  contractSize: number,
  sizeUnit: string,
): SymbolEntry {
  return {
    symbol,
    name,
    group,
    markets: ["futures"],
    contractSize,
    sizeUnit,
  };
}

// ------------------------------------------------------------------
// FOREX  —  majors, minors (crosses), exotics, spot precious metals
// ------------------------------------------------------------------
const forex: SymbolEntry[] = [
  ...fx([
    { symbol: "EURUSD", name: "Euro / US Dollar", group: "Majors" },
    { symbol: "GBPUSD", name: "British Pound / US Dollar", group: "Majors" },
    { symbol: "USDJPY", name: "US Dollar / Japanese Yen", group: "Majors" },
    { symbol: "USDCHF", name: "US Dollar / Swiss Franc", group: "Majors" },
    { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", group: "Majors" },
    { symbol: "USDCAD", name: "US Dollar / Canadian Dollar", group: "Majors" },
    { symbol: "NZDUSD", name: "New Zealand Dollar / US Dollar", group: "Majors" },

    { symbol: "EURGBP", name: "Euro / British Pound", group: "Minors" },
    { symbol: "EURJPY", name: "Euro / Japanese Yen", group: "Minors" },
    { symbol: "EURCHF", name: "Euro / Swiss Franc", group: "Minors" },
    { symbol: "EURAUD", name: "Euro / Australian Dollar", group: "Minors" },
    { symbol: "EURCAD", name: "Euro / Canadian Dollar", group: "Minors" },
    { symbol: "EURNZD", name: "Euro / New Zealand Dollar", group: "Minors" },
    { symbol: "GBPJPY", name: "British Pound / Japanese Yen", group: "Minors" },
    { symbol: "GBPCHF", name: "British Pound / Swiss Franc", group: "Minors" },
    { symbol: "GBPAUD", name: "British Pound / Australian Dollar", group: "Minors" },
    { symbol: "GBPCAD", name: "British Pound / Canadian Dollar", group: "Minors" },
    { symbol: "GBPNZD", name: "British Pound / New Zealand Dollar", group: "Minors" },
    { symbol: "AUDJPY", name: "Australian Dollar / Japanese Yen", group: "Minors" },
    { symbol: "AUDCHF", name: "Australian Dollar / Swiss Franc", group: "Minors" },
    { symbol: "AUDCAD", name: "Australian Dollar / Canadian Dollar", group: "Minors" },
    { symbol: "AUDNZD", name: "Australian Dollar / New Zealand Dollar", group: "Minors" },
    { symbol: "NZDJPY", name: "New Zealand Dollar / Japanese Yen", group: "Minors" },
    { symbol: "NZDCHF", name: "New Zealand Dollar / Swiss Franc", group: "Minors" },
    { symbol: "NZDCAD", name: "New Zealand Dollar / Canadian Dollar", group: "Minors" },
    { symbol: "CADJPY", name: "Canadian Dollar / Japanese Yen", group: "Minors" },
    { symbol: "CADCHF", name: "Canadian Dollar / Swiss Franc", group: "Minors" },
    { symbol: "CHFJPY", name: "Swiss Franc / Japanese Yen", group: "Minors" },

    { symbol: "USDTRY", name: "US Dollar / Turkish Lira", group: "Exotics" },
    { symbol: "USDZAR", name: "US Dollar / South African Rand", group: "Exotics" },
    { symbol: "USDMXN", name: "US Dollar / Mexican Peso", group: "Exotics" },
    { symbol: "USDSGD", name: "US Dollar / Singapore Dollar", group: "Exotics" },
    { symbol: "USDHKD", name: "US Dollar / Hong Kong Dollar", group: "Exotics" },
    { symbol: "USDSEK", name: "US Dollar / Swedish Krona", group: "Exotics" },
    { symbol: "USDNOK", name: "US Dollar / Norwegian Krone", group: "Exotics" },
    { symbol: "USDDKK", name: "US Dollar / Danish Krone", group: "Exotics" },
    { symbol: "USDCNH", name: "US Dollar / Offshore Chinese Yuan", group: "Exotics" },
    { symbol: "USDINR", name: "US Dollar / Indian Rupee", group: "Exotics" },
    { symbol: "USDTHB", name: "US Dollar / Thai Baht", group: "Exotics" },
    { symbol: "USDPLN", name: "US Dollar / Polish Zloty", group: "Exotics" },
    { symbol: "USDHUF", name: "US Dollar / Hungarian Forint", group: "Exotics" },
    { symbol: "USDCZK", name: "US Dollar / Czech Koruna", group: "Exotics" },
    { symbol: "USDILS", name: "US Dollar / Israeli Shekel", group: "Exotics" },
    { symbol: "USDRUB", name: "US Dollar / Russian Ruble", group: "Exotics" },
    { symbol: "USDBRL", name: "US Dollar / Brazilian Real", group: "Exotics" },
    { symbol: "USDKRW", name: "US Dollar / South Korean Won", group: "Exotics" },
    { symbol: "EURPLN", name: "Euro / Polish Zloty", group: "Exotics" },
    { symbol: "EURHUF", name: "Euro / Hungarian Forint", group: "Exotics" },
    { symbol: "EURCZK", name: "Euro / Czech Koruna", group: "Exotics" },
    { symbol: "EURTRY", name: "Euro / Turkish Lira", group: "Exotics" },
    { symbol: "EURZAR", name: "Euro / South African Rand", group: "Exotics" },
    { symbol: "EURSEK", name: "Euro / Swedish Krona", group: "Exotics" },
    { symbol: "EURNOK", name: "Euro / Norwegian Krone", group: "Exotics" },
    { symbol: "GBPZAR", name: "British Pound / South African Rand", group: "Exotics" },
    { symbol: "GBPTRY", name: "British Pound / Turkish Lira", group: "Exotics" },
  ]),

  // Spot precious metals — MT5-style contract sizes
  metal("XAUUSD", "Gold (Spot) / US Dollar", 100),
  metal("XAGUSD", "Silver (Spot) / US Dollar", 5000),
  metal("XPTUSD", "Platinum (Spot) / US Dollar", 100),
  metal("XPDUSD", "Palladium (Spot) / US Dollar", 100),
  metal("XAUEUR", "Gold (Spot) / Euro", 100),
];

// ------------------------------------------------------------------
// CRYPTO — top pairs (Binance-style USDT + a few USD variants)
// ------------------------------------------------------------------
const crypto: SymbolEntry[] = cx([
  { symbol: "BTCUSDT", name: "Bitcoin", group: "Top 10" },
  { symbol: "ETHUSDT", name: "Ethereum", group: "Top 10" },
  { symbol: "BNBUSDT", name: "BNB", group: "Top 10" },
  { symbol: "SOLUSDT", name: "Solana", group: "Top 10" },
  { symbol: "XRPUSDT", name: "XRP", group: "Top 10" },
  { symbol: "ADAUSDT", name: "Cardano", group: "Top 10" },
  { symbol: "DOGEUSDT", name: "Dogecoin", group: "Top 10" },
  { symbol: "TRXUSDT", name: "TRON", group: "Top 10" },
  { symbol: "AVAXUSDT", name: "Avalanche", group: "Top 10" },
  { symbol: "TONUSDT", name: "Toncoin", group: "Top 10" },

  { symbol: "DOTUSDT", name: "Polkadot", group: "Large caps" },
  { symbol: "LINKUSDT", name: "Chainlink", group: "Large caps" },
  { symbol: "MATICUSDT", name: "Polygon", group: "Large caps" },
  { symbol: "POLUSDT", name: "Polygon (POL)", group: "Large caps" },
  { symbol: "SHIBUSDT", name: "Shiba Inu", group: "Large caps" },
  { symbol: "LTCUSDT", name: "Litecoin", group: "Large caps" },
  { symbol: "BCHUSDT", name: "Bitcoin Cash", group: "Large caps" },
  { symbol: "UNIUSDT", name: "Uniswap", group: "Large caps" },
  { symbol: "ATOMUSDT", name: "Cosmos", group: "Large caps" },
  { symbol: "XLMUSDT", name: "Stellar", group: "Large caps" },
  { symbol: "ETCUSDT", name: "Ethereum Classic", group: "Large caps" },
  { symbol: "FILUSDT", name: "Filecoin", group: "Large caps" },
  { symbol: "ICPUSDT", name: "Internet Computer", group: "Large caps" },
  { symbol: "HBARUSDT", name: "Hedera", group: "Large caps" },
  { symbol: "NEARUSDT", name: "NEAR Protocol", group: "Large caps" },
  { symbol: "APTUSDT", name: "Aptos", group: "Large caps" },
  { symbol: "ARBUSDT", name: "Arbitrum", group: "Large caps" },
  { symbol: "OPUSDT", name: "Optimism", group: "Large caps" },
  { symbol: "IMXUSDT", name: "Immutable X", group: "Large caps" },
  { symbol: "VETUSDT", name: "VeChain", group: "Large caps" },
  { symbol: "SUIUSDT", name: "Sui", group: "Large caps" },
  { symbol: "SEIUSDT", name: "Sei", group: "Large caps" },
  { symbol: "TIAUSDT", name: "Celestia", group: "Large caps" },
  { symbol: "INJUSDT", name: "Injective", group: "Large caps" },
  { symbol: "RENDERUSDT", name: "Render", group: "Large caps" },
  { symbol: "GRTUSDT", name: "The Graph", group: "Large caps" },
  { symbol: "RUNEUSDT", name: "THORChain", group: "Large caps" },

  { symbol: "AAVEUSDT", name: "Aave", group: "DeFi" },
  { symbol: "MKRUSDT", name: "Maker", group: "DeFi" },
  { symbol: "LDOUSDT", name: "Lido DAO", group: "DeFi" },
  { symbol: "CRVUSDT", name: "Curve DAO", group: "DeFi" },
  { symbol: "COMPUSDT", name: "Compound", group: "DeFi" },
  { symbol: "SUSHIUSDT", name: "SushiSwap", group: "DeFi" },
  { symbol: "1INCHUSDT", name: "1inch", group: "DeFi" },
  { symbol: "SNXUSDT", name: "Synthetix", group: "DeFi" },
  { symbol: "JUPUSDT", name: "Jupiter", group: "DeFi" },
  { symbol: "PYTHUSDT", name: "Pyth Network", group: "DeFi" },

  { symbol: "ALGOUSDT", name: "Algorand", group: "L1 & others" },
  { symbol: "THETAUSDT", name: "Theta Network", group: "L1 & others" },
  { symbol: "FLOWUSDT", name: "Flow", group: "L1 & others" },
  { symbol: "XTZUSDT", name: "Tezos", group: "L1 & others" },
  { symbol: "EGLDUSDT", name: "MultiversX", group: "L1 & others" },
  { symbol: "EOSUSDT", name: "EOS", group: "L1 & others" },
  { symbol: "FTMUSDT", name: "Fantom", group: "L1 & others" },
  { symbol: "KASUSDT", name: "Kaspa", group: "L1 & others" },

  { symbol: "SANDUSDT", name: "The Sandbox", group: "Gaming / NFT" },
  { symbol: "MANAUSDT", name: "Decentraland", group: "Gaming / NFT" },
  { symbol: "AXSUSDT", name: "Axie Infinity", group: "Gaming / NFT" },
  { symbol: "CHZUSDT", name: "Chiliz", group: "Gaming / NFT" },
  { symbol: "GALAUSDT", name: "Gala", group: "Gaming / NFT" },
  { symbol: "ENJUSDT", name: "Enjin Coin", group: "Gaming / NFT" },

  { symbol: "PEPEUSDT", name: "Pepe", group: "Memes" },
  { symbol: "WIFUSDT", name: "dogwifhat", group: "Memes" },
  { symbol: "BONKUSDT", name: "Bonk", group: "Memes" },
  { symbol: "FLOKIUSDT", name: "Floki", group: "Memes" },

  { symbol: "FETUSDT", name: "Fetch.ai", group: "AI & Data" },
  { symbol: "AGIXUSDT", name: "SingularityNET", group: "AI & Data" },
  { symbol: "OCEANUSDT", name: "Ocean Protocol", group: "AI & Data" },
  { symbol: "WLDUSDT", name: "Worldcoin", group: "AI & Data" },
  { symbol: "TAOUSDT", name: "Bittensor", group: "AI & Data" },

  { symbol: "ONDOUSDT", name: "Ondo Finance", group: "RWA & newer" },
  { symbol: "JTOUSDT", name: "Jito", group: "RWA & newer" },
  { symbol: "STXUSDT", name: "Stacks", group: "RWA & newer" },
  { symbol: "PENDLEUSDT", name: "Pendle", group: "RWA & newer" },
  { symbol: "ENAUSDT", name: "Ethena", group: "RWA & newer" },

  { symbol: "BTCUSD", name: "Bitcoin / USD", group: "USD pairs" },
  { symbol: "ETHUSD", name: "Ethereum / USD", group: "USD pairs" },
  { symbol: "SOLUSD", name: "Solana / USD", group: "USD pairs" },
]);

// ------------------------------------------------------------------
// COMMODITIES — futures contracts (metals, energy, agriculture, livestock)
// ------------------------------------------------------------------
const commodities: SymbolEntry[] = [
  // Metals
  future("GC", "Gold Futures (COMEX)", "Metals", 100, "contracts (100 oz each)"),
  future("SI", "Silver Futures (COMEX)", "Metals", 5000, "contracts (5,000 oz each)"),
  future("HG", "Copper Futures (COMEX)", "Metals", 25000, "contracts (25,000 lb each)"),
  future("PL", "Platinum Futures (NYMEX)", "Metals", 50, "contracts (50 oz each)"),
  future("PA", "Palladium Futures (NYMEX)", "Metals", 100, "contracts (100 oz each)"),

  // Energy
  future("CL", "WTI Crude Oil (NYMEX)", "Energy", 1000, "contracts (1,000 bbl each)"),
  future("BZ", "Brent Crude Oil (ICE)", "Energy", 1000, "contracts (1,000 bbl each)"),
  future("NG", "Natural Gas (NYMEX)", "Energy", 10000, "contracts (10,000 MMBtu each)"),
  future("HO", "Heating Oil (NYMEX)", "Energy", 42000, "contracts (42,000 gal each)"),
  future("RB", "RBOB Gasoline (NYMEX)", "Energy", 42000, "contracts (42,000 gal each)"),
  future("USOIL", "WTI Crude Oil (CFD)", "Energy", 100, "lots (100 bbl each)"),
  future("UKOIL", "Brent Crude Oil (CFD)", "Energy", 100, "lots (100 bbl each)"),

  // Grains
  future("ZC", "Corn (CBOT)", "Grains", 5000, "contracts (5,000 bu each)"),
  future("ZW", "Wheat (CBOT)", "Grains", 5000, "contracts (5,000 bu each)"),
  future("ZS", "Soybeans (CBOT)", "Grains", 5000, "contracts (5,000 bu each)"),
  future("ZM", "Soybean Meal (CBOT)", "Grains", 100, "contracts (100 tons each)"),
  future("ZL", "Soybean Oil (CBOT)", "Grains", 60000, "contracts (60,000 lb each)"),
  future("ZO", "Oats (CBOT)", "Grains", 5000, "contracts (5,000 bu each)"),
  future("ZR", "Rough Rice (CBOT)", "Grains", 2000, "contracts (2,000 cwt each)"),

  // Softs
  future("KC", "Coffee (ICE)", "Softs", 37500, "contracts (37,500 lb each)"),
  future("SB", "Sugar #11 (ICE)", "Softs", 112000, "contracts (112,000 lb each)"),
  future("CC", "Cocoa (ICE)", "Softs", 10, "contracts (10 tons each)"),
  future("CT", "Cotton (ICE)", "Softs", 50000, "contracts (50,000 lb each)"),
  future("OJ", "Orange Juice (ICE)", "Softs", 15000, "contracts (15,000 lb each)"),
  future("LB", "Lumber (CME)", "Softs", 27500, "contracts (27,500 bd ft each)"),

  // Livestock
  future("LE", "Live Cattle (CME)", "Livestock", 40000, "contracts (40,000 lb each)"),
  future("GF", "Feeder Cattle (CME)", "Livestock", 50000, "contracts (50,000 lb each)"),
  future("HE", "Lean Hogs (CME)", "Livestock", 40000, "contracts (40,000 lb each)"),

  // Index futures — multiplier is $ per index point
  future("ES", "S&P 500 E-mini (CME)", "Index futures", 50, "contracts ($50/point)"),
  future("NQ", "Nasdaq 100 E-mini (CME)", "Index futures", 20, "contracts ($20/point)"),
  future("YM", "Dow Jones E-mini (CBOT)", "Index futures", 5, "contracts ($5/point)"),
  future("RTY", "Russell 2000 E-mini (CME)", "Index futures", 50, "contracts ($50/point)"),
  future("MES", "Micro S&P 500 (CME)", "Index futures", 5, "contracts ($5/point)"),
  future("MNQ", "Micro Nasdaq 100 (CME)", "Index futures", 2, "contracts ($2/point)"),
];

export const ALL_SYMBOLS: SymbolEntry[] = [...forex, ...crypto, ...commodities];

export function symbolsForMarket(market: Market): SymbolEntry[] {
  return ALL_SYMBOLS.filter((s) => s.markets.includes(market));
}

export function findSymbol(symbol: string): SymbolEntry | undefined {
  const q = symbol.trim().toUpperCase();
  return ALL_SYMBOLS.find((s) => s.symbol === q);
}

/**
 * Default contract size for a market when the symbol isn't recognized.
 * Used by the trade form to auto-fill the multiplier field.
 */
export function defaultContractSize(market: Market): number {
  switch (market) {
    case "forex":
      return 100_000;
    case "options":
      return 100; // 1 US options contract = 100 shares
    case "futures":
    case "crypto":
    case "equity":
      return 1;
  }
}

/**
 * Label used for the "size" input, per market. Aligns with how traders
 * on MT5 / brokerages think about position sizing.
 */
export function sizeFieldLabel(market: Market): {
  label: string;
  hint: string;
  step: string;
} {
  switch (market) {
    case "forex":
      return {
        label: "Lot size",
        hint: "e.g. 0.01 (micro), 0.10 (mini), 1.00 (standard)",
        step: "0.01",
      };
    case "crypto":
      return {
        label: "Amount",
        hint: "e.g. 0.5 BTC, 12.4 SOL",
        step: "any",
      };
    case "equity":
      return {
        label: "Shares",
        hint: "e.g. 100 shares",
        step: "1",
      };
    case "options":
      return {
        label: "Contracts",
        hint: "1 US contract = 100 shares",
        step: "1",
      };
    case "futures":
      return {
        label: "Contracts",
        hint: "e.g. 1 ES = $50/point",
        step: "1",
      };
  }
}
