import { NextRequest, NextResponse } from "next/server";
import { oneStoreJsonService } from "@/lib/repositories/json/onestore.json-service";
import { DataAccessError } from "@/lib/repositories/json/readJson";

/** sku and warehouse are both optional filters — omitting both lists all inventory, sorted by available units descending. */
export async function GET(request: NextRequest) {
  try {
    const sku = request.nextUrl.searchParams.get("sku") ?? undefined;
    const warehouse = request.nextUrl.searchParams.get("warehouse") ?? undefined;
    const result = await oneStoreJsonService.listInventory({ sku, warehouse });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DataAccessError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}
