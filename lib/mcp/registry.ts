import type { AgentName, ToolName } from "@/lib/schemas/tool";
import type { AnyMCPToolDefinition } from "./types";

/** Explicit registry of MCP-style tools. This is the sole authority on what capabilities exist. */
export class ToolRegistry {
  private readonly tools = new Map<ToolName, AnyMCPToolDefinition>();

  register(tool: AnyMCPToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): AnyMCPToolDefinition | undefined {
    return this.tools.get(name as ToolName);
  }

  has(name: string): boolean {
    return this.tools.has(name as ToolName);
  }

  list(): AnyMCPToolDefinition[] {
    return Array.from(this.tools.values());
  }

  listByAgent(agent: AgentName): AnyMCPToolDefinition[] {
    return this.list().filter((tool) => tool.agent === agent);
  }
}

export const toolRegistry = new ToolRegistry();
