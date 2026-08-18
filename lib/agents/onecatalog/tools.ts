import type { MCPToolDefinition } from "@/lib/mcp/types";
import { oneCatalogApiRepository } from "@/lib/repositories/api/onecatalog.api";
import {
  CheckCreditBalanceInputSchema,
  CheckCreditBalanceOutputSchema,
  type CheckCreditBalanceToolInput,
  type CheckCreditBalanceToolOutput,
  CreateCatalogInputSchema,
  CreateCatalogOutputSchema,
  type CreateCatalogToolInput,
  type CreateCatalogToolOutput,
  FetchBestPerformingFlyerInputSchema,
  FetchBestPerformingFlyerOutputSchema,
  type FetchBestPerformingFlyerToolInput,
  type FetchBestPerformingFlyerToolOutput,
} from "./schemas";

export const checkCreditBalanceTool: MCPToolDefinition<
  CheckCreditBalanceToolInput,
  CheckCreditBalanceToolOutput
> = {
  name: "checkCreditBalance",
  description: "Check a customer's catalog credit balance.",
  domain: "ONE_CATALOG",
  agent: "ONECATALOG_AGENT",
  inputSchema: CheckCreditBalanceInputSchema,
  outputSchema: CheckCreditBalanceOutputSchema,
  handler: (input) => oneCatalogApiRepository.checkCreditBalance(input),
};

export const fetchBestPerformingFlyerTool: MCPToolDefinition<
  FetchBestPerformingFlyerToolInput,
  FetchBestPerformingFlyerToolOutput
> = {
  name: "fetchBestPerformingFlyer",
  description: "Fetch the customer's best performing marketing flyer.",
  domain: "ONE_CATALOG",
  agent: "ONECATALOG_AGENT",
  inputSchema: FetchBestPerformingFlyerInputSchema,
  outputSchema: FetchBestPerformingFlyerOutputSchema,
  handler: (input) => oneCatalogApiRepository.fetchBestPerformingFlyer(input),
};

/**
 * Correction 2 from the build spec: this tool must NOT create or modify
 * catalog data. It only signals that catalog creation was requested; the
 * response builder turns that into a "Create Catalog" UI button, and the
 * actual (mock) confirmation is fetched directly by the frontend when the
 * button is clicked, via POST /api/onecatalog/create-catalog — bypassing
 * the orchestrator entirely.
 */
export const createCatalogTool: MCPToolDefinition<CreateCatalogToolInput, CreateCatalogToolOutput> = {
  name: "createCatalog",
  description:
    "Signals that the user wants to create a catalog. Creates nothing itself — the UI shows a confirmation button that performs the mock creation only when clicked.",
  domain: "ONE_CATALOG",
  agent: "ONECATALOG_AGENT",
  inputSchema: CreateCatalogInputSchema,
  outputSchema: CreateCatalogOutputSchema,
  handler: async () => ({
    status: "PENDING_UI_CONFIRMATION" as const,
    message: "You can create a catalog using the button below.",
  }),
};

export const oneCatalogTools = [checkCreditBalanceTool, fetchBestPerformingFlyerTool, createCatalogTool];
