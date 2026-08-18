import { NextRequest, NextResponse } from "next/server";
import { oneCatalogJsonService } from "@/lib/repositories/json/onecatalog.json-service";
import { DataAccessError } from "@/lib/repositories/json/readJson";

export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get("customerId") ?? undefined;
    const result = await oneCatalogJsonService.checkCreditBalance({ customerId });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DataAccessError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to fetch credit balance" }, { status: 500 });
  }
}
