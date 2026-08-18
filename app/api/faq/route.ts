import { NextRequest, NextResponse } from "next/server";
import { faqJsonService } from "@/lib/repositories/json/faq.json-service";
import { DataAccessError } from "@/lib/repositories/json/readJson";

/**
 * Dedicated FAQ endpoint, independent from /api/onestore/*. Backed by
 * faq_service.json only.
 */
export async function GET(request: NextRequest) {
  try {
    const question = request.nextUrl.searchParams.get("question");
    if (!question) {
      return NextResponse.json({ error: "question query parameter is required" }, { status: 400 });
    }
    const result = await faqJsonService.getFaqAnswer({ question });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DataAccessError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to fetch FAQ answer" }, { status: 500 });
  }
}
