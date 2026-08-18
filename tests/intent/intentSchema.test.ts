import { describe, expect, it } from "vitest";
import { IntentDetectionOutputSchema } from "@/lib/schemas/intent";

const allNullEntities = {
  orderId: null,
  customerId: null,
  limit: null,
  keyword: null,
  category: null,
  minPrice: null,
  maxPrice: null,
  sku: null,
  warehouse: null,
  quantity: null,
  shippingAddress: null,
  question: null,
};

describe("IntentDetectionOutputSchema", () => {
  it("accepts a single registered intent with every entity field present (nullable, not omitted)", () => {
    const result = IntentDetectionOutputSchema.safeParse({
      intents: [{ intent: "GET_ORDER_STATUS", entities: allNullEntities }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty intents array for an unrelated/unknown request", () => {
    const result = IntentDetectionOutputSchema.safeParse({ intents: [] });
    expect(result.success).toBe(true);
  });

  it("rejects an intent name that is not registered", () => {
    const result = IntentDetectionOutputSchema.safeParse({
      intents: [{ intent: "DELETE_ALL_DATA", entities: allNullEntities }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects entities with a missing field (every field must be present, even if null) — required for OpenAI strict structured output", () => {
    const result = IntentDetectionOutputSchema.safeParse({
      intents: [{ intent: "GET_ORDER_STATUS", entities: {} }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed payload", () => {
    const result = IntentDetectionOutputSchema.safeParse({ intents: "not-an-array" });
    expect(result.success).toBe(false);
  });
});
