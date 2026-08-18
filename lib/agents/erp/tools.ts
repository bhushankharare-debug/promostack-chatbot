import type { MCPToolDefinition } from "@/lib/mcp/types";
import { erpApiRepository } from "@/lib/repositories/api/erp.api";
import {
  GetOrderStatusInputSchema,
  GetOrderStatusOutputSchema,
  type GetOrderStatusToolInput,
  type GetOrderStatusToolOutput,
  GetTopSellingItemsInputSchema,
  GetTopSellingItemsOutputSchema,
  type GetTopSellingItemsToolInput,
  type GetTopSellingItemsToolOutput,
} from "./schemas";

export const getOrderStatusTool: MCPToolDefinition<GetOrderStatusToolInput, GetOrderStatusToolOutput> = {
  name: "getOrderStatus",
  description: "Look up the status of a customer's order(s), optionally filtered by order ID.",
  domain: "ERP",
  agent: "ERP_AGENT",
  inputSchema: GetOrderStatusInputSchema,
  outputSchema: GetOrderStatusOutputSchema,
  handler: (input) =>
    erpApiRepository.getOrderStatus({
      customerId: input.customerId ?? undefined,
      orderId: input.orderId ?? undefined,
    }),
};

export const getTopSellingItemsTool: MCPToolDefinition<
  GetTopSellingItemsToolInput,
  GetTopSellingItemsToolOutput
> = {
  name: "getTopSellingItems",
  description: "List the best-selling items over the last 90 days, ranked.",
  domain: "ERP",
  agent: "ERP_AGENT",
  inputSchema: GetTopSellingItemsInputSchema,
  outputSchema: GetTopSellingItemsOutputSchema,
  handler: (input) => erpApiRepository.getTopSellingItems({ limit: input.limit ?? undefined }),
  provides: ["sku"],
  resolveContext: (output) => ({ sku: output.items[0]?.sku }),
};

export const erpTools = [getOrderStatusTool, getTopSellingItemsTool];
