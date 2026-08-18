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

const { erpMocks, oneCatalogMocks, oneStoreMocks, faqMocks } = vi.hoisted(() => ({
  erpMocks: { getOrderStatus: vi.fn(), getTopSellingItems: vi.fn() },
  oneCatalogMocks: { checkCreditBalance: vi.fn(), fetchBestPerformingFlyer: vi.fn(), createCatalog: vi.fn() },
  oneStoreMocks: { searchProducts: vi.fn(), listInventory: vi.fn(), placeOrder: vi.fn() },
  faqMocks: { getFaqAnswer: vi.fn() },
}));

vi.mock("@/lib/repositories/api/erp.api", () => ({ erpApiRepository: erpMocks }));
vi.mock("@/lib/repositories/api/onecatalog.api", () => ({ oneCatalogApiRepository: oneCatalogMocks }));
vi.mock("@/lib/repositories/api/onestore.api", () => ({ oneStoreApiRepository: oneStoreMocks }));
vi.mock("@/lib/repositories/api/faq.api", () => ({ faqApiRepository: faqMocks }));

import { getChatbotGraph } from "@/lib/graph/chatbot.graph";
import type { DetectedIntent, IntentEntities } from "@/lib/schemas/intent";

function emptyEntities(): IntentEntities {
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

function intents(
  ...items: Array<{ intent: DetectedIntent["intent"]; entities?: Partial<IntentEntities> }>
) {
  return {
    intents: items.map((item) => ({
      intent: item.intent,
      entities: { ...emptyEntities(), ...item.entities },
    })),
  };
}

function creditBalanceFixture() {
  return {
    customerId: "CUST-10234",
    customerName: "Rohan Sharma",
    company: "Zenith Retail Pvt Ltd",
    creditLimit: 500000,
    creditUsed: 182500,
    creditAvailable: 317500,
    currency: "INR",
    lastUpdated: "2026-08-15T09:00:00Z",
    status: "Good Standing",
  };
}

function topSellingItemFixture() {
  return {
    rank: 1,
    sku: "SKU-1001",
    productName: "Stainless Steel Water Bottle 750ml",
    category: "Drinkware",
    unitsSoldLast90Days: 18400,
    revenue: 5244000,
    currency: "INR",
  };
}

function productFixture() {
  return {
    sku: "SP-BT-100",
    productName: "Compact Bluetooth Speaker",
    category: "Tech",
    subCategory: "Speakers",
    price: 24.99,
    currency: "USD",
    moq: 25,
    imprintMethods: ["Laser Engraving"],
    description: "Portable wireless Bluetooth speaker.",
    inStock: true,
  };
}

function inventoryFixture() {
  return {
    sku: "SP-BT-100",
    warehouse: "WH-EAST-01",
    availableUnits: 4200,
    reservedUnits: 300,
    reorderThreshold: 500,
  };
}

function placedOrderFixture() {
  return {
    orderId: "OS-ORD-1",
    customerId: "CUST-10234",
    sku: "SP-BT-100",
    productName: "Compact Bluetooth Speaker",
    quantity: 50,
    unitPrice: 24.99,
    totalAmount: 1249.5,
    currency: "USD",
    orderDate: "2026-08-18T10:30:00Z",
    status: "Order Confirmed",
    shippingAddress: "Not provided",
    estimatedDelivery: "2026-08-28",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockButtonDecision.mockResolvedValue({ offerCreateCatalogButton: false });
  mockProseStream.mockResolvedValue(proseStream("Here is your answer."));
});

async function runGraph(
  userQuery: string,
  sessionContext: { customerId?: string; orderId?: string } = {},
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
) {
  const graph = getChatbotGraph();
  return graph.invoke({ userQuery, conversationId: "test-conversation", sessionContext, conversationHistory });
}

describe("single-agent orchestration", () => {
  it("routes 'what is my order status' only to ERP_AGENT.getOrderStatus", async () => {
    mockDetectIntents.mockResolvedValue(
      intents({ intent: "GET_ORDER_STATUS", entities: { customerId: "CUST-10234" } })
    );
    erpMocks.getOrderStatus.mockResolvedValue({
      orders: [
        {
          orderId: "ORD-1",
          customerId: "CUST-10234",
          customerName: "Rohan Sharma",
          orderDate: "2026-08-10T00:00:00Z",
          status: "Shipped",
          items: [{ sku: "SKU-1", productName: "Widget", quantity: 1, unitPrice: 10, currency: "INR" }],
          estimatedShipDate: "2026-08-15",
          trackingNumber: null,
          totalAmount: 10,
          currency: "INR",
        },
      ],
    });

    const result = await runGraph("What is my order status?");

    expect(result.executionPlan.tasks).toHaveLength(1);
    expect(result.executionPlan.tasks[0].agent).toBe("ERP_AGENT");
    expect(result.executionPlan.tasks[0].tool).toBe("getOrderStatus");
    expect(erpMocks.getOrderStatus).toHaveBeenCalledTimes(1);
    expect(oneCatalogMocks.checkCreditBalance).not.toHaveBeenCalled();
    expect(oneStoreMocks.searchProducts).not.toHaveBeenCalled();
    expect(result.agentResults).toHaveLength(1);
    expect(result.finalResponse).toBe("Here is your answer.");
  });

  it("routes a credit balance question only to ONECATALOG_AGENT.checkCreditBalance", async () => {
    mockDetectIntents.mockResolvedValue(
      intents({ intent: "CHECK_CREDIT_BALANCE", entities: { customerId: "CUST-10234" } })
    );
    oneCatalogMocks.checkCreditBalance.mockResolvedValue({ balance: creditBalanceFixture() });

    const result = await runGraph("Check my catalog credit balance");

    expect(result.executionPlan.tasks[0].tool).toBe("checkCreditBalance");
    expect(oneCatalogMocks.checkCreditBalance).toHaveBeenCalledTimes(1);
    expect(erpMocks.getOrderStatus).not.toHaveBeenCalled();
    expect(oneStoreMocks.searchProducts).not.toHaveBeenCalled();
  });
});

describe("multi-agent parallel orchestration", () => {
  it("runs top-selling-items and credit-balance independently, in parallel", async () => {
    mockDetectIntents.mockResolvedValue(
      intents(
        { intent: "GET_TOP_SELLING_ITEMS" },
        { intent: "CHECK_CREDIT_BALANCE", entities: { customerId: "CUST-10234" } }
      )
    );
    erpMocks.getTopSellingItems.mockResolvedValue({ items: [topSellingItemFixture()] });
    oneCatalogMocks.checkCreditBalance.mockResolvedValue({ balance: creditBalanceFixture() });

    const result = await runGraph("Show me my top selling items and check my credit balance.");

    expect(result.executionPlan.executionMode).toBe("PARALLEL");
    expect(result.executionPlan.tasks.map((t) => t.agent).sort()).toEqual(["ERP_AGENT", "ONECATALOG_AGENT"]);
    expect(result.agentResults).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });
});

describe("multi-agent sequential orchestration", () => {
  it("chains searchProducts -> getInventory -> placeOrder, passing the resolved sku forward", async () => {
    mockDetectIntents.mockResolvedValue(
      intents(
        { intent: "SEARCH_PRODUCTS", entities: { keyword: "bluetooth speaker", maxPrice: 5000 } },
        { intent: "PLACE_ORDER", entities: { quantity: 50 } }
      )
    );
    oneStoreMocks.searchProducts.mockResolvedValue({ products: [productFixture()] });
    oneStoreMocks.listInventory.mockResolvedValue({ inventory: [inventoryFixture()] });
    oneStoreMocks.placeOrder.mockResolvedValue({ order: placedOrderFixture() });

    const result = await runGraph("Find Bluetooth speakers under ₹5,000 and place an order for 50 units.");

    expect(result.executionPlan.executionMode).toBe("SEQUENTIAL");
    expect(oneStoreMocks.listInventory).toHaveBeenCalledWith(expect.objectContaining({ sku: "SP-BT-100" }));
    expect(oneStoreMocks.placeOrder).toHaveBeenCalledWith(
      expect.objectContaining({ sku: "SP-BT-100", quantity: 50 })
    );
    expect(result.errors).toHaveLength(0);
    expect(result.agentResults).toHaveLength(3);
  });
});

describe("inventory browsing (LIST_INVENTORY)", () => {
  it("lists inventory for a named warehouse without requiring a SKU", async () => {
    mockDetectIntents.mockResolvedValue(
      intents({ intent: "LIST_INVENTORY", entities: { warehouse: "WH-EAST-01" } })
    );
    oneStoreMocks.listInventory.mockResolvedValue({
      inventory: [inventoryFixture(), { ...inventoryFixture(), sku: "EB-500", availableUnits: 2750 }],
    });

    const result = await runGraph("Which products are available in WH-EAST-01 warehouse and their inventory?");

    expect(result.clarificationRequest).toBeNull();
    expect(result.executionPlan.tasks[0].tool).toBe("listInventory");
    expect(oneStoreMocks.listInventory).toHaveBeenCalledWith(
      expect.objectContaining({ warehouse: "WH-EAST-01" })
    );
    expect(result.agentResults).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("lists all inventory (no warehouse filter) for 'which warehouse has the most units' style questions", async () => {
    mockDetectIntents.mockResolvedValue(intents({ intent: "LIST_INVENTORY" }));
    oneStoreMocks.listInventory.mockResolvedValue({ inventory: [inventoryFixture()] });

    const result = await runGraph("Which warehouse has the max available units?");

    expect(result.clarificationRequest).toBeNull();
    expect(oneStoreMocks.listInventory).toHaveBeenCalledWith(expect.objectContaining({ warehouse: undefined }));
    expect(result.errors).toHaveLength(0);
  });
});

describe("partial failure handling", () => {
  it("preserves a successful OneCatalog result even when ERP fails", async () => {
    mockDetectIntents.mockResolvedValue(
      intents(
        { intent: "GET_TOP_SELLING_ITEMS" },
        { intent: "CHECK_CREDIT_BALANCE", entities: { customerId: "CUST-10234" } }
      )
    );
    erpMocks.getTopSellingItems.mockRejectedValue(new Error("ERP service unavailable"));
    oneCatalogMocks.checkCreditBalance.mockResolvedValue({ balance: creditBalanceFixture() });

    const result = await runGraph("Show me my top selling items and check my credit balance.");

    expect(result.agentResults).toHaveLength(1);
    expect(result.agentResults[0].tool).toBe("checkCreditBalance");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].tool).toBe("getTopSellingItems");
    expect(result.errors[0].stage).toBe("TOOL_EXECUTION");
  });

  it("skips dependent tasks in cascade when their upstream dependency fails", async () => {
    mockDetectIntents.mockResolvedValue(
      intents(
        { intent: "SEARCH_PRODUCTS", entities: { keyword: "speaker" } },
        { intent: "PLACE_ORDER", entities: { quantity: 5 } }
      )
    );
    oneStoreMocks.searchProducts.mockRejectedValue(new Error("catalog offline"));

    const result = await runGraph("Find speakers and place an order for 5 units.");

    expect(result.agentResults).toHaveLength(0);
    expect(result.errors).toHaveLength(3);
    expect(result.errors.map((e) => e.tool).sort()).toEqual(["getInventory", "placeOrder", "searchProducts"]);
  });
});

describe("FAQ isolation", () => {
  it("routes an FAQ question only to FAQ_AGENT, never OneStore", async () => {
    mockDetectIntents.mockResolvedValue(
      intents({ intent: "GET_FAQ_ANSWER", entities: { question: "What is the minimum order quantity?" } })
    );
    faqMocks.getFaqAnswer.mockResolvedValue({
      bestMatch: { faqId: "FAQ-003", category: "Ordering Basics", question: "q", answer: "a" },
      matchScore: 1,
      alternates: [],
    });

    const result = await runGraph("What is the minimum order quantity?");

    expect(result.executionPlan.tasks[0].agent).toBe("FAQ_AGENT");
    expect(faqMocks.getFaqAnswer).toHaveBeenCalledTimes(1);
    expect(oneStoreMocks.searchProducts).not.toHaveBeenCalled();
    expect(oneStoreMocks.listInventory).not.toHaveBeenCalled();
  });
});

describe("catalog creation UI flow", () => {
  it("signals a Create Catalog button without ever calling the create-catalog repository", async () => {
    mockDetectIntents.mockResolvedValue(intents({ intent: "CREATE_CATALOG" }));
    mockButtonDecision.mockResolvedValueOnce({ offerCreateCatalogButton: true });
    mockProseStream.mockResolvedValueOnce(proseStream("You can create a catalog using the button below."));

    const result = await runGraph("I want to create a catalog");

    expect(result.uiActions).toEqual([{ type: "CREATE_CATALOG_BUTTON", label: "Create Catalog" }]);
    expect(oneCatalogMocks.createCatalog).not.toHaveBeenCalled();
  });

  it("does not offer the button when the response builder decides a stated condition wasn't met", async () => {
    mockDetectIntents.mockResolvedValue(
      intents(
        { intent: "CREATE_CATALOG" },
        { intent: "CHECK_CREDIT_BALANCE", entities: { customerId: "CUST-10890" } }
      )
    );
    oneCatalogMocks.checkCreditBalance.mockResolvedValue({
      balance: { ...creditBalanceFixture(), customerId: "CUST-10890", creditAvailable: 0, status: "On Hold" },
    });
    mockButtonDecision.mockResolvedValueOnce({ offerCreateCatalogButton: false });
    mockProseStream.mockResolvedValueOnce(
      proseStream("Your account is on hold with no available credit, so I did not create the catalog.")
    );

    const result = await runGraph(
      "I want to create a catalog and my customer id is CUST-10890. If I have sufficient balance in credit limit then only create catalog"
    );

    expect(result.uiActions).toEqual([]);
    expect(result.agentResults.some((r) => r.tool === "createCatalog")).toBe(true);
  });
});

describe("intent detection failure", () => {
  it("produces a safe fallback response and records the error when intent detection throws", async () => {
    mockDetectIntents.mockRejectedValue(new Error("openai down"));

    const result = await runGraph("anything");

    expect(result.intents).toHaveLength(0);
    expect(result.errors.some((e) => e.stage === "INTENT_DETECTION")).toBe(true);
    expect(result.finalResponse.length).toBeGreaterThan(0);
  });
});

describe("interactive identity clarification", () => {
  it("asks for a Customer ID instead of guessing when a credit balance query has none", async () => {
    mockDetectIntents.mockResolvedValue(intents({ intent: "CHECK_CREDIT_BALANCE" }));

    const result = await runGraph("What is my current credit limit?");

    expect(result.clarificationRequest).not.toBeNull();
    expect(result.clarificationRequest?.acceptedFields).toEqual(["customerId"]);
    expect(result.finalResponse).toContain("Customer ID");
    expect(oneCatalogMocks.checkCreditBalance).not.toHaveBeenCalled();
    expect(result.agentResults).toHaveLength(0);
  });

  it("asks for an Order ID or Customer ID when an order status query has neither", async () => {
    mockDetectIntents.mockResolvedValue(intents({ intent: "GET_ORDER_STATUS" }));

    const result = await runGraph("What is the status of my order?");

    expect(result.clarificationRequest?.acceptedFields).toEqual(["orderId", "customerId"]);
    expect(erpMocks.getOrderStatus).not.toHaveBeenCalled();
  });

  it("does not ask again once the identifier is already remembered from an earlier turn", async () => {
    mockDetectIntents.mockResolvedValue(intents({ intent: "CHECK_CREDIT_BALANCE" }));
    oneCatalogMocks.checkCreditBalance.mockResolvedValue({ balance: creditBalanceFixture() });

    const result = await runGraph("What about my credit balance now?", { customerId: "CUST-10234" });

    expect(result.clarificationRequest).toBeNull();
    expect(oneCatalogMocks.checkCreditBalance).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "CUST-10234" })
    );
  });

  it("applies the same rule to fetchBestPerformingFlyer", async () => {
    mockDetectIntents.mockResolvedValue(intents({ intent: "FETCH_BEST_PERFORMING_FLYER" }));

    const result = await runGraph("What's my best performing flyer?");

    expect(result.clarificationRequest?.acceptedFields).toEqual(["customerId"]);
    expect(oneCatalogMocks.fetchBestPerformingFlyer).not.toHaveBeenCalled();
  });

  it("forwards recent conversation history to intent detection as grounding context (fallback for lost session state)", async () => {
    mockDetectIntents.mockResolvedValue(intents({ intent: "FETCH_BEST_PERFORMING_FLYER" }));
    oneCatalogMocks.fetchBestPerformingFlyer.mockResolvedValue({ flyer: null });

    await runGraph("CUST-10234", {}, [
      { role: "user", content: "Do I need to upload my artwork again or can you use the previous one?" },
      { role: "assistant", content: "Sure — could you provide your Customer ID so I can look up your flyer performance?" },
    ]);

    expect(mockDetectIntents).toHaveBeenCalledWith([
      expect.any(Array), // system message tuple
      ["human", "Do I need to upload my artwork again or can you use the previous one?"],
      ["ai", "Sure — could you provide your Customer ID so I can look up your flyer performance?"],
      ["human", "CUST-10234"],
    ]);
  });
});

describe("unknown/unrelated request", () => {
  it("responds gracefully and invokes no agents when nothing registered matches", async () => {
    mockDetectIntents.mockResolvedValue({ intents: [] });

    const result = await runGraph("What's the weather like today?");

    expect(result.executionPlan.tasks).toHaveLength(0);
    expect(result.agentResults).toHaveLength(0);
    expect(erpMocks.getOrderStatus).not.toHaveBeenCalled();
    expect(oneStoreMocks.searchProducts).not.toHaveBeenCalled();
    expect(result.finalResponse.length).toBeGreaterThan(0);
  });

  it("gives a warm greeting reply (not an error-sounding fallback) for plain small talk", async () => {
    mockDetectIntents.mockResolvedValue({ intents: [] });
    mockProseStream.mockResolvedValueOnce(
      proseStream("Hi! I can help with order status, credit balance, product search and more — what would you like to do?")
    );

    const result = await runGraph("hi");

    expect(result.finalResponse).toContain("Hi!");
    expect(result.finalResponse.toLowerCase()).not.toContain("couldn't find");
    expect(mockProseStream).toHaveBeenCalledTimes(1);
    expect(result.uiActions).toEqual([]);
  });
});
