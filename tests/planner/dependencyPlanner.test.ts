import { describe, expect, it } from "vitest";
import { buildExecutionPlan } from "@/lib/graph/planning/dependencyPlanner";
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

function intent(
  name: DetectedIntent["intent"],
  entities: Partial<IntentEntities> = {}
): DetectedIntent {
  return { intent: name, entities: { ...emptyEntities(), ...entities } };
}

describe("buildExecutionPlan", () => {
  it("builds a SINGLE-mode plan with correct agent/tool selection", () => {
    const { tasks, executionMode } = buildExecutionPlan([intent("GET_ORDER_STATUS")]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].agent).toBe("ERP_AGENT");
    expect(tasks[0].tool).toBe("getOrderStatus");
    expect(executionMode).toBe("SINGLE");
  });

  it("plans independent intents with no dependencies, in PARALLEL", () => {
    const { tasks, executionMode } = buildExecutionPlan([
      intent("GET_TOP_SELLING_ITEMS"),
      intent("CHECK_CREDIT_BALANCE"),
    ]);
    expect(tasks).toHaveLength(2);
    expect(tasks.every((t) => t.dependsOn.length === 0)).toBe(true);
    expect(tasks.map((t) => t.agent).sort()).toEqual(["ERP_AGENT", "ONECATALOG_AGENT"]);
    expect(executionMode).toBe("PARALLEL");
  });

  it("auto-inserts an inventory check and chains search -> inventory -> placeOrder SEQUENTIALLY", () => {
    const { tasks, executionMode } = buildExecutionPlan([
      intent("SEARCH_PRODUCTS", { keyword: "bluetooth speaker", maxPrice: 5000 }),
      intent("PLACE_ORDER", { quantity: 50 }),
    ]);

    expect(tasks.map((t) => t.tool)).toEqual(["searchProducts", "getInventory", "placeOrder"]);
    const [searchTask, inventoryTask, placeOrderTask] = tasks;

    expect(searchTask.dependsOn).toEqual([]);
    expect(inventoryTask.dependsOn).toEqual([searchTask.taskId]);
    expect(inventoryTask.contextBindings).toEqual([{ field: "sku", fromTaskId: searchTask.taskId }]);
    expect(inventoryTask.implicit).toBe(true);
    expect(placeOrderTask.dependsOn).toEqual([inventoryTask.taskId]);
    expect(placeOrderTask.contextBindings).toEqual([{ field: "sku", fromTaskId: inventoryTask.taskId }]);
    expect(executionMode).toBe("SEQUENTIAL");
  });

  it("does not create a context binding when the sku is already explicit", () => {
    const { tasks } = buildExecutionPlan([intent("PLACE_ORDER", { sku: "EB-500", quantity: 10 })]);
    const placeOrderTask = tasks.find((t) => t.tool === "placeOrder")!;
    const inventoryTask = tasks.find((t) => t.tool === "getInventory")!;
    expect(placeOrderTask.contextBindings).toEqual([]);
    expect(inventoryTask.contextBindings).toEqual([]);
  });

  it("mixes a dependent chain with an independent task (MIXED mode)", () => {
    const { tasks, executionMode } = buildExecutionPlan([
      intent("GET_TOP_SELLING_ITEMS"),
      intent("GET_INVENTORY"),
      intent("CHECK_CREDIT_BALANCE"),
    ]);

    const topSellingTask = tasks.find((t) => t.tool === "getTopSellingItems")!;
    const inventoryTask = tasks.find((t) => t.tool === "getInventory")!;
    const creditTask = tasks.find((t) => t.tool === "checkCreditBalance")!;

    expect(inventoryTask.dependsOn).toEqual([topSellingTask.taskId]);
    expect(creditTask.dependsOn).toEqual([]);
    expect(executionMode).toBe("MIXED");
  });

  it("routes an FAQ intent to FAQ_AGENT independently of OneStore", () => {
    const { tasks } = buildExecutionPlan([
      intent("GET_FAQ_ANSWER", { question: "What is the minimum order quantity?" }),
    ]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].agent).toBe("FAQ_AGENT");
    expect(tasks[0].tool).toBe("getFaqAnswer");
  });
});
