import { NextResponse } from "next/server";
import { oneCatalogJsonService } from "@/lib/repositories/json/onecatalog.json-service";
import { DataAccessError } from "@/lib/repositories/json/readJson";

/**
 * POC action endpoint. Returns the static mock confirmation from
 * onecatalog_service.json. No database write happens here — the button in
 * the UI calls this to display a success message only.
 */
export async function POST() {
  try {
    const result = await oneCatalogJsonService.createCatalog();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DataAccessError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to create catalog" }, { status: 500 });
  }
}
