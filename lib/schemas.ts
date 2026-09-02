import { z } from "zod";

export const marketSchema = z.enum([
  "forex",
  "crypto",
  "equity",
  "options",
  "futures",
]);

export const emotionSchema = z.enum([
  "calm",
  "focused",
  "confident",
  "anxious",
  "fearful",
  "greedy",
  "fomo",
  "revenge",
  "bored",
  "tired",
  "euphoric",
  "frustrated",
]);

/** Includes a client-side-only "all" pseudo-value used by the picker. */
export const marketOrAllSchema = z.enum([
  "all",
  "forex",
  "crypto",
  "equity",
  "options",
  "futures",
]);
export const directionSchema = z.enum(["long", "short"]);
export const statusSchema = z.enum(["planned", "open", "closed"]);
export const executionGradeSchema = z.enum(["A", "B", "C", "D", "F"]);

const nullableNumber = z.union([z.number(), z.null()]).optional();
const emptyToNull = z
  .string()
  .transform((v) => (v.trim() === "" ? null : v))
  .nullable()
  .optional();

/** One item in a playbook rule checklist. */
export const playbookChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, "Rule text required").max(160),
});

export const playbookFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(80, "Too long")
    .transform((s) => s.trim()),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i, "Use a hex color like #22c55e")
    .optional()
    .nullable(),
  target_r_multiple: z.number().positive("Must be positive").optional().nullable(),
  checklist: z.array(playbookChecklistItemSchema).max(20),
  is_archived: z.boolean().optional(),
});

export type PlaybookFormValues = z.infer<typeof playbookFormSchema>;

export const tradeFormSchema = z
  .object({
    symbol: z
      .string()
      .min(1, "Symbol is required")
      .max(40, "Too long")
      .transform((s) => s.trim().toUpperCase()),
    market: marketOrAllSchema.refine((v) => v !== "all", {
      message: "Please pick a specific market",
    }),
    account_id: z.string().uuid("Please pick an account"),
    playbook_id: z
      .string()
      .uuid()
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),
    status: statusSchema,
    direction: directionSchema,
    entry_price: z.number().positive("Entry price must be positive"),
    exit_price: nullableNumber,
    quantity: z.number().positive("Quantity must be positive"),
    lot_size: nullableNumber,
    entry_at: z.string().min(1, "Entry time required"),
    exit_at: z.string().optional().nullable(),
    fees: z.number().min(0),
    stop_loss: nullableNumber,
    take_profit: nullableNumber,
    // Pre-trade plan.
    planned_entry: nullableNumber,
    planned_stop: nullableNumber,
    planned_target: nullableNumber,
    thesis: emptyToNull,
    // Dollar amount at risk on entry. Powers R-multiple analytics — without
    // this, expectancy in R is uncomputable.
    initial_risk: z.number().positive("Risk must be positive").optional().nullable(),
    // Playbook checklist item ids ticked at entry.
    checklist_completed: z.array(z.string()).max(50).optional(),
    execution_grade: executionGradeSchema.optional().nullable(),
    emotion_pre: emotionSchema.optional().nullable(),
    emotion_post: emotionSchema.optional().nullable(),
    mistake_codes: z.array(z.string().min(1).max(40)).max(20).optional(),
    strategy: z.string().max(80).optional().nullable(),
    notes_entry: z.string().max(4000).optional().nullable(),
    notes_exit: z.string().max(4000).optional().nullable(),
    mistakes: z.string().max(2000).optional().nullable(),
    tags: z.array(z.string().min(1).max(40)).max(20),
  })
  .refine(
    (data) =>
      !data.exit_at ||
      !data.entry_at ||
      new Date(data.exit_at).getTime() >= new Date(data.entry_at).getTime(),
    { message: "Exit time must be after entry time", path: ["exit_at"] },
  )
  .refine(
    (data) => data.status !== "closed" || (data.exit_price != null && data.exit_at),
    { message: "Closed trades need exit price and time", path: ["exit_price"] },
  );

export type TradeFormInput = z.input<typeof tradeFormSchema>;
export type TradeFormValues = z.output<typeof tradeFormSchema>;

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Minimum 6 characters"),
});

export const signUpSchema = signInSchema.extend({
  display_name: z.string().min(1, "Name required").max(80),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
