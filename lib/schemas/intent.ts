import { z } from "zod";
import { IntentNameSchema } from "./tool";

/**
 * Flat "superset of slots" entity schema shared by every intent. Each intent
 * only cares about a subset of these fields; unused fields are simply left
 * null. Every field is nullable-but-required (not optional) because
 * OpenAI's strict structured-output mode requires every property to appear
 * in the schema's `required` list — an `.optional()` field (one the model
 * could omit entirely) is rejected there, while a `.nullable()` one (always
 * present, value can be null) is not.
 */
export const IntentEntitiesSchema = z.object({
  orderId: z
    .string()
    .nullable()
    .describe("An explicit order ID such as ORD-78341, if the user mentioned one. Otherwise null."),
  customerId: z
    .string()
    .nullable()
    .describe("An explicit customer ID such as CUST-10234, if the user mentioned one. Otherwise null."),
  limit: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe("How many results the user wants, e.g. 'top 3 items'. Otherwise null."),
  keyword: z
    .string()
    .nullable()
    .describe("Free-text product search keywords, e.g. 'bluetooth speaker'. Otherwise null."),
  category: z.string().nullable().describe("A product category, if mentioned. Otherwise null."),
  minPrice: z.number().nullable().describe("Minimum price filter, if mentioned. Otherwise null."),
  maxPrice: z.number().nullable().describe("Maximum price filter, if mentioned. Otherwise null."),
  sku: z.string().nullable().describe("An explicit product SKU, if the user mentioned one. Otherwise null."),
  warehouse: z
    .string()
    .nullable()
    .describe("An explicit warehouse code such as WH-EAST-01, if the user mentioned one. Otherwise null."),
  quantity: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe("An order quantity, e.g. 'order 50 units'. Otherwise null."),
  shippingAddress: z.string().nullable().describe("A shipping address, if mentioned. Otherwise null."),
  question: z
    .string()
    .nullable()
    .describe("The user's FAQ question, restated plainly, for FAQ lookups. Otherwise null."),
});
export type IntentEntities = z.infer<typeof IntentEntitiesSchema>;

export const DetectedIntentSchema = z.object({
  intent: IntentNameSchema.describe(
    "The single registered capability that best matches this part of the user's request. Must be one of the enum values — never invent a new one."
  ),
  entities: IntentEntitiesSchema,
});
export type DetectedIntent = z.infer<typeof DetectedIntentSchema>;

export const IntentDetectionOutputSchema = z.object({
  intents: z
    .array(DetectedIntentSchema)
    .max(6)
    .describe(
      "One entry per distinct capability request found in the user's message. Empty if none of the registered capabilities apply."
    ),
});
export type IntentDetectionOutput = z.infer<typeof IntentDetectionOutputSchema>;
