import { describe, expect, it } from "vitest";
import "@/lib/mcp/agentRegistry";
import { toolRegistry } from "@/lib/mcp/registry";

describe("toolRegistry", () => {
  it("registers exactly the ten registered tools", () => {
    const names = toolRegistry
      .list()
      .map((tool) => tool.name)
      .sort();
    expect(names).toEqual(
      [
        "checkCreditBalance",
        "createCatalog",
        "fetchBestPerformingFlyer",
        "getFaqAnswer",
        "getInventory",
        "getOrderStatus",
        "getTopSellingItems",
        "listInventory",
        "placeOrder",
        "searchProducts",
      ].sort()
    );
  });

  it("owns getFaqAnswer under FAQ_AGENT, never ONESTORE_AGENT", () => {
    const faqTool = toolRegistry.get("getFaqAnswer");
    expect(faqTool?.agent).toBe("FAQ_AGENT");
    expect(toolRegistry.listByAgent("ONESTORE_AGENT").map((tool) => tool.name)).not.toContain(
      "getFaqAnswer"
    );
  });

  it("scopes each agent to only its own tools", () => {
    expect(toolRegistry.listByAgent("ERP_AGENT").map((t) => t.name).sort()).toEqual(
      ["getOrderStatus", "getTopSellingItems"].sort()
    );
    expect(toolRegistry.listByAgent("ONECATALOG_AGENT").map((t) => t.name).sort()).toEqual(
      ["checkCreditBalance", "createCatalog", "fetchBestPerformingFlyer"].sort()
    );
    expect(toolRegistry.listByAgent("ONESTORE_AGENT").map((t) => t.name).sort()).toEqual(
      ["getInventory", "listInventory", "placeOrder", "searchProducts"].sort()
    );
    expect(toolRegistry.listByAgent("FAQ_AGENT").map((t) => t.name)).toEqual(["getFaqAnswer"]);
  });

  it("returns undefined/false for an unregistered tool name", () => {
    expect(toolRegistry.get("deleteEverything")).toBeUndefined();
    expect(toolRegistry.has("deleteEverything")).toBe(false);
  });

  it("rejects double-registering the same tool name", () => {
    const existing = toolRegistry.get("getOrderStatus")!;
    expect(() => toolRegistry.register(existing)).toThrow();
  });
});
