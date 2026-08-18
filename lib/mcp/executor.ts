import type { ToolName } from "@/lib/schemas/tool";
import { toolRegistry } from "./registry";
import { ToolExecutionError, ToolValidationError, UnknownToolError } from "./types";

/**
 * Central MCP tool executor: registry lookup -> Zod input validation ->
 * handler -> Zod output validation. This is the only path through which
 * any tool ever runs; an unregistered or malformed request is rejected
 * here before it reaches a handler.
 */
export async function executeTool(toolName: string, rawInput: unknown): Promise<unknown> {
  const tool = toolRegistry.get(toolName);
  if (!tool) {
    throw new UnknownToolError(toolName);
  }

  const inputParse = tool.inputSchema.safeParse(rawInput);
  if (!inputParse.success) {
    throw new ToolValidationError(`Invalid input for tool ${toolName}`, inputParse.error.issues);
  }

  let output: unknown;
  try {
    output = await tool.handler(inputParse.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool handler failed";
    throw new ToolExecutionError(`Tool ${toolName} failed: ${message}`, error);
  }

  const outputParse = tool.outputSchema.safeParse(output);
  if (!outputParse.success) {
    throw new ToolValidationError(`Invalid output from tool ${toolName}`, outputParse.error.issues);
  }

  return outputParse.data;
}

export function resolveToolContext(toolName: ToolName, output: unknown): Record<string, unknown> {
  const tool = toolRegistry.get(toolName);
  if (!tool?.resolveContext) return {};
  return tool.resolveContext(output);
}
