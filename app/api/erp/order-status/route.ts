import { NextRequest, NextResponse } from "next/server";
import { erpJsonService } from "@/lib/repositories/json/erp.json-service";
import { DataAccessError } from "@/lib/repositories/json/readJson";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId") ?? undefined;
    const orderId = searchParams.get("orderId") ?? undefined;
    const result = await erpJsonService.getOrderStatus({ customerId, orderId });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DataAccessError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to fetch order status" }, { status: 500 });
  }
}
