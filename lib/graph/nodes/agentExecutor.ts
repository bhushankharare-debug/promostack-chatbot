import { Send } from "@langchain/langgraph";
import { executeTool, resolveToolContext } from "@/lib/mcp/executor";
import { ToolExecutionError, ToolValidationError, UnknownToolError } from "@/lib/mcp/types";
import type { AgentError, ErrorStage } from "@/lib/schemas/agentError";
import type { PlannedTask } from "@/lib/schemas/executionPlan";
import type { ChatState, ChatStateUpdate } from "../state";

/**
 * Scheduler node: on every pass, cascades a "skipped" error to any
 * not-yet-attempted task whose dependency already failed. This is a
 * regular node (not the conditional router itself) because it needs to
 * write new error entries to state — the conditional edge that follows it
 * only reads state to decide where to go next.
 */
export function schedulerNode(state: ChatState): ChatStateUpdate {
  const { tasks } = state.executionPlan;
  const erroredTaskIds = new Set(state.errors.filter((e) => e.taskId).map((e) => e.taskId as string));
  const resultTaskIds = new Set(state.agentResults.map((r) => r.taskId));

  const newSkipErrors: AgentError[] = [];
  for (const task of tasks) {
    if (resultTaskIds.has(task.taskId) || erroredTaskIds.has(task.taskId)) continue;
    const blockedByFailedDependency = task.dependsOn.some((depId) => erroredTaskIds.has(depId));
    if (blockedByFailedDependency) {
      newSkipErrors.push({
        taskId: task.taskId,
        intent: task.intent,
        agent: task.agent,
        tool: task.tool,
        stage: "AGENT_EXECUTION",
        message: "Skipped because a required earlier step failed.",
        occurredAt: new Date().toISOString(),
      });
    }
  }

  return newSkipErrors.length > 0 ? { errors: newSkipErrors } : {};
}

/**
 * Resolves a ready task's contextBindings against the accumulated
 * agentResults. Done here — inside the router, which is a normal
 * state-reading function — rather than inside "runTask" itself, because
 * Send()'s args become the *entire* input a target node invocation
 * receives; other channels (like agentResults) are not merged in for that
 * invocation, so any context resolution that needs them must happen before
 * dispatch, not after.
 */
function resolveTaskContext(task: PlannedTask, agentResults: ChatState["agentResults"]): Record<string, unknown> {
  const resolvedContext: Record<string, unknown> = {};
  for (const binding of task.contextBindings) {
    const upstreamResult = agentResults.find((result) => result.taskId === binding.fromTaskId);
    if (upstreamResult) {
      const provided = resolveToolContext(upstreamResult.tool, upstreamResult.data);
      resolvedContext[binding.field] = provided[binding.field];
    }
  }
  return resolvedContext;
}

/**
 * Conditional edge after the scheduler: dispatches every currently-ready
 * task (dependencies satisfied) as a parallel Send to "runTask", routes to
 * "aggregate" once every task has a result or an error, or loops back to
 * "scheduler" for another skip-cascade pass when a chain of dependent
 * failures hasn't fully propagated yet. The plan is a DAG by construction
 * (dependsOn only ever points to strictly earlier tasks), so this always
 * terminates.
 */
export function routeAfterScheduler(state: ChatState): string | Send | (string | Send)[] {
  const { tasks } = state.executionPlan;
  if (tasks.length === 0) return "aggregate";

  const successIds = new Set(state.agentResults.map((r) => r.taskId));
  const erroredIds = new Set(state.errors.filter((e) => e.taskId).map((e) => e.taskId as string));
  const doneIds = new Set<string>([...successIds, ...erroredIds]);

  const readyTasks = tasks.filter(
    (task) => !doneIds.has(task.taskId) && task.dependsOn.every((dep) => successIds.has(dep))
  );

  if (readyTasks.length > 0) {
    return readyTasks.map(
      (task) =>
        new Send("runTask", {
          taskToRun: task,
          resolvedContext: resolveTaskContext(task, state.agentResults),
        })
    );
  }
  if (doneIds.size >= tasks.length) {
    return "aggregate";
  }
  return "scheduler";
}

function classifyError(error: unknown): ErrorStage {
  if (error instanceof ToolValidationError) return "TOOL_INPUT_VALIDATION";
  if (error instanceof UnknownToolError) return "CAPABILITY_VALIDATION";
  if (error instanceof ToolExecutionError) return "TOOL_EXECUTION";
  return "AGENT_EXECUTION";
}

function compactEntities(entities: Record<string, unknown>): Record<string, unknown> {
  const compacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entities)) {
    if (value !== null && value !== undefined) {
      compacted[key] = value;
    }
  }
  return compacted;
}

/**
 * Worker node: executes exactly one task, dispatched via Send() from the
 * router with its context already resolved (see resolveTaskContext above).
 * Runs the tool through the central MCP executor (Zod input validation ->
 * handler -> Zod output validation).
 */
export async function runTaskNode(state: ChatState): Promise<ChatStateUpdate> {
  const task = state.taskToRun;
  if (!task) return {};

  const startedAt = new Date().toISOString();
  const rawInput = { ...compactEntities(task.entities), ...state.resolvedContext };

  try {
    const output = await executeTool(task.tool, rawInput);
    return {
      agentResults: [
        {
          taskId: task.taskId,
          intent: task.intent,
          agent: task.agent,
          tool: task.tool,
          status: "SUCCESS",
          input: rawInput,
          data: output,
          startedAt,
          completedAt: new Date().toISOString(),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool execution failed";
    return {
      errors: [
        {
          taskId: task.taskId,
          intent: task.intent,
          agent: task.agent,
          tool: task.tool,
          stage: classifyError(error),
          message,
          occurredAt: new Date().toISOString(),
        },
      ],
    };
  }
}
