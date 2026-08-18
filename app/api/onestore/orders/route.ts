import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { oneStoreJsonService } from "@/lib/repositories/json/onestore.json-service";
import { DataAccessError } from "@/lib/repositories/json/readJson";

const PlaceOrderRequestSchema = z.object({
  customerId: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
  shippingAddress: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = PlaceOrderRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order request", details: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await oneStoreJsonService.placeOrder(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DataAccessError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const message = error instanceof Error ? error.message : "Failed to place order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
