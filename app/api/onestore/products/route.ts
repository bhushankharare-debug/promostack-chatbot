import { NextRequest, NextResponse } from "next/server";
import { oneStoreJsonService } from "@/lib/repositories/json/onestore.json-service";
import { DataAccessError } from "@/lib/repositories/json/readJson";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");
    const result = await oneStoreJsonService.searchProducts({
      keyword,
      category,
      minPrice: minPriceParam ? Number(minPriceParam) : undefined,
      maxPrice: maxPriceParam ? Number(maxPriceParam) : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DataAccessError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to search products" }, { status: 500 });
  }
}
