import { z } from "zod";

export const marketSchema = z.enum([
  "forex",
  "crypto",
  "equity",
  "options",
  "futures",
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
export const statusSchema = z.enum(["open", "closed"]);

const nullableNumber = z.union([z.number(), z.null()]).optional();

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
