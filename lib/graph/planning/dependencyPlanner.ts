import { v4 as uuidv4 } from "uuid";
import "@/lib/mcp/agentRegistry";
import { toolRegistry } from "@/lib/mcp/registry";
import type { DetectedIntent, IntentEntities } from "@/lib/schemas/intent";
import type { ExecutionMode, PlannedTask } from "@/lib/schemas/executionPlan";
import { CAPABILITY_MAP } from "@/lib/schemas/tool";

function createTask(intent: DetectedIntent, implicit = false): PlannedTask {
  const capability = CAPABILITY_MAP[intent.intent];
  return {
    taskId: `${capability.tool}-${uuidv4().slice(0, 8)}`,
    intent: intent.intent,
    agent: capability.agent,
    tool: capability.tool,
    entities: intent.entities,
    dependsOn: [],
    contextBindings: [],
    implicit,
  };
}

function hasField(entities: IntentEntities, field: string): boolean {
  const value = (entities as Record<string, unknown>)[field];
  return value !== undefined && value !== null && value !== "";
}

/**
 * Deterministic (non-LLM) task planning: turns detected intents into an
 * ordered task list with explicit dependsOn/contextBindings edges, using
 * only declared tool capability metadata (requiresContext/provides) — never
 * the user's raw text. This is the "registration/configuration data is
 * fine, hardcoded NL routing is not" line the build spec draws.
 */
export function buildExecutionPlan(intents: DetectedIntent[]): {
  tasks: PlannedTask[];
  executionMode: ExecutionMode;
} {
  const tasks: PlannedTask[] = intents.map((intent) => createTask(intent));

  // Domain rule: never place an order without a preceding stock check.
  for (const placeOrderTask of tasks.filter((t) => t.tool === "placeOrder")) {
    const alreadyHasInventoryCheck = tasks.some((t) => t.tool === "getInventory");
    if (!alreadyHasInventoryCheck) {
      const inventoryTask = createTask(
        { intent: "GET_INVENTORY", entities: { ...placeOrderTask.entities } },
        true
      );
      tasks.splice(tasks.indexOf(placeOrderTask), 0, inventoryTask);
    }
  }

  // Wire dependsOn/contextBindings for any required field a task doesn't already have,
  // preferring the nearest earlier task that declares it can provide that field.
  for (const task of tasks) {
    const tool = toolRegistry.get(task.tool);
    const requiredFields = tool?.requiresContext ?? [];

    for (const field of requiredFields) {
      if (hasField(task.entities, field)) continue;

      const taskIndex = tasks.indexOf(task);
      let provider: PlannedTask | undefined;
      for (let i = taskIndex - 1; i >= 0; i -= 1) {
        const candidate = tasks[i];
        if (toolRegistry.get(candidate.tool)?.provides?.includes(field)) {
          provider = candidate;
          break;
        }
      }
      if (!provider) continue;

      if (!task.dependsOn.includes(provider.taskId)) {
        task.dependsOn.push(provider.taskId);
      }
      task.contextBindings.push({ field, fromTaskId: provider.taskId });
    }
  }

  return { tasks, executionMode: summarizeExecutionMode(tasks) };
}

function summarizeExecutionMode(tasks: PlannedTask[]): ExecutionMode {
  if (tasks.length <= 1) return "SINGLE";
  const dependentTasks = tasks.filter((t) => t.dependsOn.length > 0);
  if (dependentTasks.length === 0) return "PARALLEL";
  if (dependentTasks.length === tasks.length - 1) return "SEQUENTIAL";
  return "MIXED";
}
