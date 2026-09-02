export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Market = "forex" | "crypto" | "equity" | "options" | "futures";
export type Direction = "long" | "short";
export type TradeStatus = "planned" | "open" | "closed";
export type ImageKind = "entry_chart" | "exit_chart" | "other";
export type AccountType = "live" | "demo" | "paper";
export type TradeSource = "manual" | "mt5_import" | "csv_import" | "api_sync";
export type ExecutionGrade = "A" | "B" | "C" | "D" | "F";
export type Emotion =
  | "calm"
  | "focused"
  | "confident"
  | "anxious"
  | "fearful"
  | "greedy"
  | "fomo"
  | "revenge"
  | "bored"
  | "tired"
  | "euphoric"
  | "frustrated";
export type JournalEntryKind = "daily" | "weekly";

/** One rule in a playbook checklist (e.g. "Waited for retest"). */
export type PlaybookChecklistItem = { id: string; label: string };

export const MISTAKE_CODES = [
  "chased_entry",
  "moved_stop",
  "oversized",
  "no_stop",
  "revenge_trade",
  "no_plan",
  "ignored_news",
  "fomo_entry",
  "early_exit",
  "held_loser",
  "against_trend",
  "overtraded",
] as const;
export type MistakeCode = (typeof MISTAKE_CODES)[number];

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
  playbook_id: string | null;
  initial_risk: number | null;
  planned_entry: number | null;
  planned_stop: number | null;
  planned_target: number | null;
  thesis: string | null;
  checklist_completed: string[];
  execution_grade: ExecutionGrade | null;
  emotion_pre: Emotion | null;
  emotion_post: Emotion | null;
  created_at: string;
  updated_at: string;
};

type TradeMistakeRowShape = {
  id: string;
  trade_id: string;
  code: string;
};

type JournalEntryRowShape = {
  id: string;
  user_id: string;
  kind: JournalEntryKind;
  entry_date: string;
  mood: Emotion | null;
  market_conditions: string | null;
  what_went_well: string | null;
  what_went_wrong: string | null;
  lessons: string | null;
  focus_tomorrow: string | null;
  created_at: string;
  updated_at: string;
};

type PlaybookRowShape = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  target_r_multiple: number | null;
  checklist: PlaybookChecklistItem[];
  is_archived: boolean;
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
  daily_loss_limit: number | null;
  max_drawdown_limit: number | null;
  prop_firm_name: string | null;
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
          playbook_id?: string | null;
          initial_risk?: number | null;
          planned_entry?: number | null;
          planned_stop?: number | null;
          planned_target?: number | null;
          thesis?: string | null;
          checklist_completed?: string[];
          execution_grade?: ExecutionGrade | null;
          emotion_pre?: Emotion | null;
          emotion_post?: Emotion | null;
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
          playbook_id: string | null;
          initial_risk: number | null;
          planned_entry: number | null;
          planned_stop: number | null;
          planned_target: number | null;
          thesis: string | null;
          checklist_completed: string[];
          execution_grade: ExecutionGrade | null;
          emotion_pre: Emotion | null;
          emotion_post: Emotion | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      trade_mistakes: {
        Row: TradeMistakeRowShape;
        Insert: {
          id?: string;
          trade_id: string;
          code: string;
        };
        Update: Partial<{
          trade_id: string;
          code: string;
        }>;
        Relationships: [];
      };
      journal_entries: {
        Row: JournalEntryRowShape;
        Insert: {
          id?: string;
          user_id: string;
          kind?: JournalEntryKind;
          entry_date: string;
          mood?: Emotion | null;
          market_conditions?: string | null;
          what_went_well?: string | null;
          what_went_wrong?: string | null;
          lessons?: string | null;
          focus_tomorrow?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          kind: JournalEntryKind;
          entry_date: string;
          mood: Emotion | null;
          market_conditions: string | null;
          what_went_well: string | null;
          what_went_wrong: string | null;
          lessons: string | null;
          focus_tomorrow: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      playbooks: {
        Row: PlaybookRowShape;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          color?: string | null;
          target_r_multiple?: number | null;
          checklist?: PlaybookChecklistItem[];
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          name: string;
          description: string | null;
          color: string | null;
          target_r_multiple: number | null;
          checklist: PlaybookChecklistItem[];
          is_archived: boolean;
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
          daily_loss_limit?: number | null;
          max_drawdown_limit?: number | null;
          prop_firm_name?: string | null;
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
          daily_loss_limit: number | null;
          max_drawdown_limit: number | null;
          prop_firm_name: string | null;
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
      execution_grade: ExecutionGrade;
      emotion: Emotion;
      journal_entry_kind: JournalEntryKind;
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
export type PlaybookRow = PlaybookRowShape;
export type PlaybookInsert = Database["public"]["Tables"]["playbooks"]["Insert"];
export type TradeMistakeRow = TradeMistakeRowShape;
export type JournalEntryRow = JournalEntryRowShape;
export type JournalEntryInsert =
  Database["public"]["Tables"]["journal_entries"]["Insert"];
