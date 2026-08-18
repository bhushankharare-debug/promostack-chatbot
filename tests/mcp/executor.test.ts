import { describe, expect, it } from "vitest";
import "@/lib/mcp/agentRegistry";
import { executeTool } from "@/lib/mcp/executor";
import { ToolValidationError, UnknownToolError } from "@/lib/mcp/types";

describe("executeTool", () => {
  it("rejects an unregistered/unknown tool cleanly instead of running arbitrary code", async () => {
    await expect(executeTool("deleteDatabase", {})).rejects.toBeInstanceOf(UnknownToolError);
  });

  it("rejects placeOrder input missing a required sku, before any handler runs", async () => {
    await expect(
      executeTool("placeOrder", { customerId: "CUST-10234", quantity: 10 })
    ).rejects.toBeInstanceOf(ToolValidationError);
  });

  it("rejects a non-positive quantity for placeOrder", async () => {
    await expect(
      executeTool("placeOrder", { customerId: "CUST-10234", sku: "EB-500", quantity: 0 })
    ).rejects.toBeInstanceOf(ToolValidationError);
  });

  it("rejects getInventory called without a sku", async () => {
    await expect(executeTool("getInventory", {})).rejects.toBeInstanceOf(ToolValidationError);
  });

  it("rejects getFaqAnswer called without a question", async () => {
    await expect(executeTool("getFaqAnswer", {})).rejects.toBeInstanceOf(ToolValidationError);
  });
});
