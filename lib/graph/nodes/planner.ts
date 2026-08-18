import "@/lib/mcp/agentRegistry";
import { toolRegistry } from "@/lib/mcp/registry";
import type { AgentError } from "@/lib/schemas/agentError";
import type { PlannedTask } from "@/lib/schemas/executionPlan";
import { buildExecutionPlan } from "../planning/dependencyPlanner";
import type { ChatState, ChatStateUpdate } from "../state";

/**
 * LangGraph node: task planning + capability validation. Builds the
 * dependency-aware execution plan, then defends against drift between the
 * intent schema and the live tool registry by rejecting any task whose
 * tool isn't actually registered (defense in depth — the intent schema
 * already constrains the LLM to the enum, so this should normally be a
 * no-op, but an unregistered/unknown tool must never reach execution).
 */
export async function planTasksNode(state: ChatState): Promise<ChatStateUpdate> {
  if (state.intents.length === 0) {
    return { executionPlan: { tasks: [], executionMode: "SINGLE" } };
  }

  const { tasks, executionMode } = buildExecutionPlan(state.intents);

  const validTasks: PlannedTask[] = [];
  const errors: AgentError[] = [];

  for (const task of tasks) {
    if (!toolRegistry.has(task.tool)) {
      errors.push({
        taskId: task.taskId,
        intent: task.intent,
        agent: task.agent,
        tool: task.tool,
        stage: "CAPABILITY_VALIDATION",
        message: `Rejected: "${task.tool}" is not a registered tool.`,
        occurredAt: new Date().toISOString(),
      });
      continue;
    }
    validTasks.push(task);
  }

  return {
    executionPlan: { tasks: validTasks, executionMode },
    errors,
  };
}
