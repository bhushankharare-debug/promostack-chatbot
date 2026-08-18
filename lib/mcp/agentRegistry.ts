import { erpAgent } from "@/lib/agents/erp/agent";
import { faqAgent } from "@/lib/agents/faq/agent";
import { oneCatalogAgent } from "@/lib/agents/onecatalog/agent";
import { oneStoreAgent } from "@/lib/agents/onestore/agent";
import type { AgentName, DomainName } from "@/lib/schemas/tool";
import { toolRegistry } from "./registry";

export interface RegisteredAgent {
  name: AgentName;
  domain: DomainName;
  description: string;
}

const allAgents = [erpAgent, oneCatalogAgent, oneStoreAgent, faqAgent];

let registered = false;

/**
 * Registers every agent's tools into the shared MCP tool registry.
 * Idempotent, so it's safe to call from multiple entry points (the chat
 * API, tests, etc.). Adding a new agent means adding it to `allAgents` —
 * nothing else in the orchestration graph needs to change.
 */
export function registerAllAgentsAndTools(): void {
  if (registered) return;
  for (const agent of allAgents) {
    for (const tool of agent.tools) {
      if (!toolRegistry.has(tool.name)) {
        toolRegistry.register(tool);
      }
    }
  }
  registered = true;
}

export function listAgentDescriptors(): RegisteredAgent[] {
  registerAllAgentsAndTools();
  return allAgents.map((agent) => ({
    name: agent.name,
    domain: agent.domain,
    description: agent.description,
  }));
}

registerAllAgentsAndTools();
