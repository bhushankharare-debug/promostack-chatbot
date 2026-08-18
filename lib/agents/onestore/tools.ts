import type { MCPToolDefinition } from "@/lib/mcp/types";
import { oneStoreApiRepository } from "@/lib/repositories/api/onestore.api";
import {
  GetInventoryInputSchema,
  GetInventoryOutputSchema,
  type GetInventoryToolInput,
  type GetInventoryToolOutput,
  ListInventoryInputSchema,
  ListInventoryOutputSchema,
  type ListInventoryToolInput,
  type ListInventoryToolOutput,
  PlaceOrderInputSchema,
  PlaceOrderOutputSchema,
  type PlaceOrderToolInput,
  type PlaceOrderToolOutput,
  SearchProductsInputSchema,
  SearchProductsOutputSchema,
  type SearchProductsToolInput,
  type SearchProductsToolOutput,
} from "./schemas";

export const searchProductsTool: MCPToolDefinition<SearchProductsToolInput, SearchProductsToolOutput> = {
  name: "searchProducts",
  description: "Search the product catalog by keyword, category and/or price range.",
  domain: "ONE_STORE",
  agent: "ONESTORE_AGENT",
  inputSchema: SearchProductsInputSchema,
  outputSchema: SearchProductsOutputSchema,
  handler: (input) =>
    oneStoreApiRepository.searchProducts({
      keyword: input.keyword ?? undefined,
      category: input.category ?? undefined,
      minPrice: input.minPrice ?? undefined,
      maxPrice: input.maxPrice ?? undefined,
    }),
  provides: ["sku"],
  resolveContext: (output) => ({ sku: output.products[0]?.sku }),
};

export const getInventoryTool: MCPToolDefinition<GetInventoryToolInput, GetInventoryToolOutput> = {
  name: "getInventory",
  description: "Check available inventory for one specific, already-known product SKU.",
  domain: "ONE_STORE",
  agent: "ONESTORE_AGENT",
  inputSchema: GetInventoryInputSchema,
  outputSchema: GetInventoryOutputSchema,
  handler: async (input) => {
    const { inventory } = await oneStoreApiRepository.listInventory({ sku: input.sku });
    return { inventory: inventory[0] ?? null };
  },
  requiresContext: ["sku"],
  provides: ["sku"],
  resolveContext: (output) => ({ sku: output.inventory?.sku }),
};

export const listInventoryTool: MCPToolDefinition<ListInventoryToolInput, ListInventoryToolOutput> = {
  name: "listInventory",
  description:
    "Browse inventory across all warehouses or one specific warehouse, sorted by available units descending — for 'what's in warehouse X' or 'which warehouse/SKU has the most stock' style questions, when no single SKU was named.",
  domain: "ONE_STORE",
  agent: "ONESTORE_AGENT",
  inputSchema: ListInventoryInputSchema,
  outputSchema: ListInventoryOutputSchema,
  handler: (input) => oneStoreApiRepository.listInventory({ warehouse: input.warehouse ?? undefined }),
};

export const placeOrderTool: MCPToolDefinition<PlaceOrderToolInput, PlaceOrderToolOutput> = {
  name: "placeOrder",
  description: "Place an order for a product SKU and quantity (POC mock — not persisted to a database).",
  domain: "ONE_STORE",
  agent: "ONESTORE_AGENT",
  inputSchema: PlaceOrderInputSchema,
  outputSchema: PlaceOrderOutputSchema,
  handler: (input) =>
    oneStoreApiRepository.placeOrder({
      customerId: input.customerId,
      sku: input.sku,
      quantity: input.quantity,
      shippingAddress: input.shippingAddress ?? undefined,
    }),
  requiresContext: ["sku"],
};

export const oneStoreTools = [searchProductsTool, getInventoryTool, listInventoryTool, placeOrderTool];
