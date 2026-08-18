import type { ZodType } from "zod";
import type { AgentName, DomainName, ToolName } from "@/lib/schemas/tool";

/**
 * MCP-style tool definition: an explicitly registered, Zod-validated
 * capability owned by exactly one domain and one agent. This is an
 * in-process registry/executor abstraction modeled on the same shape a real
 * MCP tool description would have (name, description, schemas, handler),
 * not a reimplementation of the MCP wire protocol — a single Next.js
 * process has no cross-process boundary for that protocol to cross.
 */
export interface MCPToolDefinition<TInput = unknown, TOutput = unknown> {
  name: ToolName;
  description: string;
  domain: DomainName;
  agent: AgentName;
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
  handler: (input: TInput) => Promise<TOutput>;
  /**
   * Input field names this tool needs that, if absent from the caller's
   * entities, must be resolved from an upstream task's output in the same
   * execution plan.
   */
  requiresContext?: string[];
  /** Field names this tool's output can supply to satisfy another task's requiresContext. Declared statically so the planner can match without running the tool. */
  provides?: string[];
  /** Given this tool's validated output, extract the concrete values for the fields listed in `provides`. */
  resolveContext?: (output: TOutput) => Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMCPToolDefinition = MCPToolDefinition<any, any>;

export class ToolValidationError extends Error {
  constructor(message: string, public readonly issues?: unknown) {
    super(message);
    this.name = "ToolValidationError";
  }
}

export class UnknownToolError extends Error {
  constructor(toolName: string) {
    super(`Unknown or unregistered tool: ${toolName}`);
    this.name = "UnknownToolError";
  }
}

export class ToolExecutionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ToolExecutionError";
  }
}
