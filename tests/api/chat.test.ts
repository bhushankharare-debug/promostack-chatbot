import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST as postChat } from "@/app/api/chat/route";

function chatRequest(body: string): NextRequest {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/chat request validation", () => {
  it("rejects an empty query with 400, before ever touching the graph", async () => {
    const response = await postChat(chatRequest(JSON.stringify({ message: "" })));
    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    const response = await postChat(chatRequest("{not valid json"));
    expect(response.status).toBe(400);
  });

  it("rejects a request missing the message field", async () => {
    const response = await postChat(chatRequest(JSON.stringify({ conversationId: "abc" })));
    expect(response.status).toBe(400);
  });
});
