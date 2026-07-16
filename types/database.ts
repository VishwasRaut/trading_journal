export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Market = "forex" | "crypto" | "equity" | "options" | "futures";
export type Direction = "long" | "short";
export type TradeStatus = "open" | "closed";
export type ImageKind = "entry_chart" | "exit_chart" | "other";
export type AccountType = "live" | "demo" | "paper";
export type TradeSource = "manual" | "mt5_import" | "csv_import" | "api_sync";

type ProfileRowShape = {
  id: string;
  display_name: string | null;
  default_currency: string;
  starting_capital: number;
  created_at: string;
};

type TradeRowShape = {
  id: string;
  user_id: string;
  account_id: string | null;
  symbol: string;
  market: Market;
  direction: Direction;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  lot_size: number | null;
  entry_at: string;
  exit_at: string | null;
  status: TradeStatus;
  pnl: number | null;
  pnl_percent: number | null;
  fees: number;
  stop_loss: number | null;
  take_profit: number | null;
  strategy: string | null;
  notes_entry: string | null;
  notes_exit: string | null;
  mistakes: string | null;
  source: TradeSource;
  external_id: string | null;
  created_at: string;
  updated_at: string;
};

type TradingAccountRowShape = {
  id: string;
  user_id: string;
  name: string;
  broker: string | null;
  account_type: AccountType;
  currency: string;
  starting_balance: number;
  color: string | null;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type TradeTagRowShape = {
  id: string;
  trade_id: string;
  tag: string;
};

type TradeImageRowShape = {
  id: string;
  trade_id: string;
  kind: ImageKind;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRowShape;
        Insert: {
          id: string;
          display_name?: string | null;
          default_currency?: string;
          starting_capital?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          default_currency?: string;
          starting_capital?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      trades: {
        Row: TradeRowShape;
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          symbol: string;
          market: Market;
          direction: Direction;
          entry_price: number;
          exit_price?: number | null;
          quantity: number;
          lot_size?: number | null;
          entry_at: string;
          exit_at?: string | null;
          status?: TradeStatus;
          pnl?: number | null;
          pnl_percent?: number | null;
          fees?: number;
          stop_loss?: number | null;
          take_profit?: number | null;
          strategy?: string | null;
          notes_entry?: string | null;
          notes_exit?: string | null;
          mistakes?: string | null;
          source?: TradeSource;
          external_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          account_id: string | null;
          symbol: string;
          market: Market;
          direction: Direction;
          entry_price: number;
          exit_price: number | null;
          quantity: number;
          lot_size: number | null;
          entry_at: string;
          exit_at: string | null;
          status: TradeStatus;
          pnl: number | null;
          pnl_percent: number | null;
          fees: number;
          stop_loss: number | null;
          take_profit: number | null;
          strategy: string | null;
          notes_entry: string | null;
          notes_exit: string | null;
          mistakes: string | null;
          source: TradeSource;
          external_id: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      trading_accounts: {
        Row: TradingAccountRowShape;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          broker?: string | null;
          account_type?: AccountType;
          currency?: string;
          starting_balance?: number;
          color?: string | null;
          is_default?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          name: string;
          broker: string | null;
          account_type: AccountType;
          currency: string;
          starting_balance: number;
          color: string | null;
          is_default: boolean;
          is_archived: boolean;
          updated_at: string;
        }>;
        Relationships: [];
      };
      trade_tags: {
        Row: TradeTagRowShape;
        Insert: {
          id?: string;
          trade_id: string;
          tag: string;
        };
        Update: Partial<{
          trade_id: string;
          tag: string;
        }>;
        Relationships: [];
      };
      trade_images: {
        Row: TradeImageRowShape;
        Insert: {
          id?: string;
          trade_id: string;
          kind: ImageKind;
          storage_path: string;
          caption?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          trade_id: string;
          kind: ImageKind;
          storage_path: string;
          caption: string | null;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      market: Market;
      direction: Direction;
      trade_status: TradeStatus;
      image_kind: ImageKind;
      account_type: AccountType;
      trade_source: TradeSource;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type TradeRow = TradeRowShape;
export type TradeInsert = Database["public"]["Tables"]["trades"]["Insert"];
export type TradeImageRow = TradeImageRowShape;
export type TradeTagRow = TradeTagRowShape;
export type ProfileRow = ProfileRowShape;
export type TradingAccountRow = TradingAccountRowShape;
export type TradingAccountInsert =
  Database["public"]["Tables"]["trading_accounts"]["Insert"];
