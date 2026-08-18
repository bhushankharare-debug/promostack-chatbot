import { NextRequest, NextResponse } from "next/server";
import { erpJsonService } from "@/lib/repositories/json/erp.json-service";
import { DataAccessError } from "@/lib/repositories/json/readJson";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;
    const result = await erpJsonService.getTopSellingItems({ limit });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DataAccessError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to fetch top selling items" }, { status: 500 });
  }
}
