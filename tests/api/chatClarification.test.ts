import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDetectIntents, mockButtonDecision, mockProseStream } = vi.hoisted(() => ({
  mockDetectIntents: vi.fn(),
  mockButtonDecision: vi.fn(),
  mockProseStream: vi.fn(),
}));

vi.mock("@/lib/ai/openai", () => ({
  getChatModel: () => ({
    withStructuredOutput: (_schema: unknown, config?: { name?: string }) => ({
      invoke: config?.name === "catalog_button_decision" ? mockButtonDecision : mockDetectIntents,
    }),
    stream: mockProseStream,
  }),
}));

/** Fakes ChatOpenAI's .stream() — an async iterable of message chunks with a `.content` fragment each. */
function proseStream(text: string) {
  return (async function* () {
    yield { content: text };
  })();
}

const { oneCatalogMocks } = vi.hoisted(() => ({
  oneCatalogMocks: { checkCreditBalance: vi.fn(), fetchBestPerformingFlyer: vi.fn(), createCatalog: vi.fn() },
}));

vi.mock("@/lib/repositories/api/onecatalog.api", () => ({ oneCatalogApiRepository: oneCatalogMocks }));

import { POST as postChat } from "@/app/api/chat/route";
import type { ChatResponse } from "@/lib/schemas/chat";

function emptyEntities() {
  return {
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
}

function creditBalanceFixture(customerId: string) {
  return {
    customerId,
    customerName: "Test Customer",
    company: "Test Co",
    creditLimit: 100000,
    creditUsed: 5000,
    creditAvailable: 95000,
    currency: "INR",
    lastUpdated: "2026-08-15T09:00:00Z",
    status: "Good Standing",
  };
}

function flyerFixture(customerId: string) {
  return {
    flyerId: "FLYER-1",
    flyerName: "Test Flyer",
    customerId,
    createdAt: "2026-06-01T00:00:00Z",
    views: 100,
    clicks: 10,
    conversions: 2,
    conversionRate: "20%",
    revenueGenerated: 1000,
    currency: "INR",
    rank: 1,
    flyerUrl: "http://example.com/flyer",
  };
}

async function readDoneResponse(response: Response): Promise<ChatResponse> {
  if (!response.body) throw new Error("Response has no body");
  const text = await new Response(response.body).text();
  const lines = text.split("\n").filter((line) => line.trim());
  for (const line of lines) {
    const event = JSON.parse(line);
    if (event.type === "done") return event.response as ChatResponse;
  }
  throw new Error("Stream ended without a done event");
}

async function sendMessage(message: string, conversationId?: string): Promise<ChatResponse> {
  const response = await postChat(
    new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversationId }),
      headers: { "Content-Type": "application/json" },
    })
  );
  return readDoneResponse(response);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockButtonDecision.mockResolvedValue({ offerCreateCatalogButton: false });
  mockProseStream.mockResolvedValue(proseStream("Here is your answer."));
});

describe("multi-turn identity clarification over HTTP", () => {
  it("asks for a Customer ID, accepts the follow-up answer, then remembers it for a later unrelated query", async () => {
    // Turn 1: ambiguous credit balance question -> bot must ask, not guess.
    mockDetectIntents.mockResolvedValueOnce({
      intents: [{ intent: "CHECK_CREDIT_BALANCE", entities: emptyEntities() }],
    });

    const turn1 = await sendMessage("What is my current credit limit?");
    expect(turn1.message).toContain("Customer ID");
    expect(turn1.usedAgents).toEqual([]);
    expect(oneCatalogMocks.checkCreditBalance).not.toHaveBeenCalled();

    const conversationId = turn1.conversationId;
    expect(conversationId).toBeTruthy();

    // Turn 2: user answers with just the identifier — must resolve without a fresh LLM intent call.
    oneCatalogMocks.checkCreditBalance.mockResolvedValueOnce({ balance: creditBalanceFixture("CUST-789") });

    const turn2 = await sendMessage("Customer ID is CUST789.", conversationId);
    expect(turn2.usedAgents).toEqual(["ONECATALOG_AGENT"]);
    expect(oneCatalogMocks.checkCreditBalance).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "CUST-789" })
    );
    // Resuming a clarification reuses the stored intent, so intent detection is not re-invoked.
    expect(mockDetectIntents).toHaveBeenCalledTimes(1);

    // Turn 3: a different customer-scoped query, same conversation, no ID repeated — must reuse CUST-789.
    mockDetectIntents.mockResolvedValueOnce({
      intents: [{ intent: "FETCH_BEST_PERFORMING_FLYER", entities: emptyEntities() }],
    });
    oneCatalogMocks.fetchBestPerformingFlyer.mockResolvedValueOnce({ flyer: flyerFixture("CUST-789") });

    const turn3 = await sendMessage("What about my best performing flyer?", conversationId);
    expect(turn3.usedAgents).toEqual(["ONECATALOG_AGENT"]);
    expect(oneCatalogMocks.fetchBestPerformingFlyer).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "CUST-789" })
    );
  });

  it("re-asks (without crashing) when the reply doesn't contain a recognizable identifier", async () => {
    mockDetectIntents.mockResolvedValueOnce({
      intents: [{ intent: "CHECK_CREDIT_BALANCE", entities: emptyEntities() }],
    });

    const turn1 = await sendMessage("Check my credit balance");
    expect(turn1.message).toContain("Customer ID");
    const conversationId = turn1.conversationId;

    const turn2 = await sendMessage("I don't remember it", conversationId);
    expect(turn2.message).toContain("Customer ID");
    expect(oneCatalogMocks.checkCreditBalance).not.toHaveBeenCalled();
  });
});
