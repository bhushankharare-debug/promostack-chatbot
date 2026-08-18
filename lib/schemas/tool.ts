import { z } from "zod";

/**
 * Single source of truth for agent/domain/tool/intent identifiers and the
 * static capability map that links them together. This is registration
 * data (explicitly allowed by the build spec) — it never inspects a user's
 * message, so it is not a natural-language router.
 */

export const AgentNameSchema = z.enum([
  "ONECATALOG_AGENT",
  "ERP_AGENT",
  "ONESTORE_AGENT",
  "FAQ_AGENT",
]);
export type AgentName = z.infer<typeof AgentNameSchema>;

export const DomainNameSchema = z.enum(["ONE_CATALOG", "ERP", "ONE_STORE", "FAQ"]);
export type DomainName = z.infer<typeof DomainNameSchema>;

export const ToolNameSchema = z.enum([
  "getOrderStatus",
  "getTopSellingItems",
  "checkCreditBalance",
  "fetchBestPerformingFlyer",
  "createCatalog",
  "searchProducts",
  "getInventory",
  "listInventory",
  "placeOrder",
  "getFaqAnswer",
]);
export type ToolName = z.infer<typeof ToolNameSchema>;

export const IntentNameSchema = z.enum([
  "GET_ORDER_STATUS",
  "GET_TOP_SELLING_ITEMS",
  "CHECK_CREDIT_BALANCE",
  "FETCH_BEST_PERFORMING_FLYER",
  "CREATE_CATALOG",
  "SEARCH_PRODUCTS",
  "GET_INVENTORY",
  "LIST_INVENTORY",
  "PLACE_ORDER",
  "GET_FAQ_ANSWER",
]);
export type IntentName = z.infer<typeof IntentNameSchema>;

export interface CapabilityDefinition {
  intent: IntentName;
  tool: ToolName;
  agent: AgentName;
  domain: DomainName;
  description: string;
}

export const CAPABILITY_MAP: Record<IntentName, CapabilityDefinition> = {
  GET_ORDER_STATUS: {
    intent: "GET_ORDER_STATUS",
    tool: "getOrderStatus",
    agent: "ERP_AGENT",
    domain: "ERP",
    description: "Look up the status of a customer's order(s).",
  },
  GET_TOP_SELLING_ITEMS: {
    intent: "GET_TOP_SELLING_ITEMS",
    tool: "getTopSellingItems",
    agent: "ERP_AGENT",
    domain: "ERP",
    description: "List the best-selling items over the last 90 days.",
  },
  CHECK_CREDIT_BALANCE: {
    intent: "CHECK_CREDIT_BALANCE",
    tool: "checkCreditBalance",
    agent: "ONECATALOG_AGENT",
    domain: "ONE_CATALOG",
    description: "Check a customer's catalog credit balance.",
  },
  FETCH_BEST_PERFORMING_FLYER: {
    intent: "FETCH_BEST_PERFORMING_FLYER",
    tool: "fetchBestPerformingFlyer",
    agent: "ONECATALOG_AGENT",
    domain: "ONE_CATALOG",
    description: "Fetch the customer's best performing marketing flyer.",
  },
  CREATE_CATALOG: {
    intent: "CREATE_CATALOG",
    tool: "createCatalog",
    agent: "ONECATALOG_AGENT",
    domain: "ONE_CATALOG",
    description: "Start the catalog creation flow (POC: UI-confirmed, no persistence).",
  },
  SEARCH_PRODUCTS: {
    intent: "SEARCH_PRODUCTS",
    tool: "searchProducts",
    agent: "ONESTORE_AGENT",
    domain: "ONE_STORE",
    description: "Search the product catalog by keyword, category or price.",
  },
  GET_INVENTORY: {
    intent: "GET_INVENTORY",
    tool: "getInventory",
    agent: "ONESTORE_AGENT",
    domain: "ONE_STORE",
    description: "Check available inventory for a specific, known product SKU.",
  },
  LIST_INVENTORY: {
    intent: "LIST_INVENTORY",
    tool: "listInventory",
    agent: "ONESTORE_AGENT",
    domain: "ONE_STORE",
    description:
      "Browse inventory across all warehouses or one specific warehouse, sorted by available units — for questions like 'what's in warehouse WH-EAST-01' or 'which warehouse/SKU has the most stock', when no single SKU was named.",
  },
  PLACE_ORDER: {
    intent: "PLACE_ORDER",
    tool: "placeOrder",
    agent: "ONESTORE_AGENT",
    domain: "ONE_STORE",
    description: "Place an order for a product SKU and quantity.",
  },
  GET_FAQ_ANSWER: {
    intent: "GET_FAQ_ANSWER",
    tool: "getFaqAnswer",
    agent: "FAQ_AGENT",
    domain: "FAQ",
    description: "Answer a general ordering/production/shipping FAQ question.",
  },
};

export const ALL_INTENT_NAMES = IntentNameSchema.options;
