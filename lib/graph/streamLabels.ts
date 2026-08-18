import type { ToolName } from "@/lib/schemas/tool";

/** Per-tool "what am I doing right now" labels, shown while that task is running — mirrors Claude's shifting status text, driven by real graph progress rather than a fixed "Thinking...". */
const TOOL_STATUS_LABELS: Partial<Record<ToolName, string>> = {
  getOrderStatus: "Checking your order status…",
  getTopSellingItems: "Finding your top sellers…",
  checkCreditBalance: "Checking your credit balance…",
  fetchBestPerformingFlyer: "Looking up your best flyer…",
  createCatalog: "Preparing catalog creation…",
  searchProducts: "Searching products…",
  getInventory: "Checking inventory…",
  placeOrder: "Placing your order…",
  getFaqAnswer: "Looking that up…",
};

const NODE_STATUS_LABELS: Record<string, string> = {
  understandQuery: "Reading your message…",
  detectIntent: "Understanding what you need…",
  planTasks: "Planning the steps…",
  identityGate: "Checking a few details…",
  aggregate: "Putting it all together…",
};

interface AgentResultLike {
  tool?: ToolName;
}

/**
 * Given one node's name and the partial state update it just returned
 * (from LangGraph's "updates" stream mode), derives a human status label —
 * or null to stay silent (e.g. internal scheduler loop passes).
 */
export function describeGraphUpdate(nodeName: string, update: Record<string, unknown>): string | null {
  if (nodeName === "runTask") {
    const results = (update.agentResults as AgentResultLike[] | undefined) ?? [];
    const errors = (update.errors as AgentResultLike[] | undefined) ?? [];
    const tool = results[0]?.tool ?? errors[0]?.tool;
    return (tool && TOOL_STATUS_LABELS[tool]) || "Looking that up…";
  }
  return NODE_STATUS_LABELS[nodeName] ?? null;
}
