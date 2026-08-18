import type { IntentEntities } from "@/lib/schemas/intent";
import type { PlannedTask } from "@/lib/schemas/executionPlan";
import { IDENTITY_REQUIREMENTS } from "../planning/identityRequirements";
import type { ChatState, ChatStateUpdate, SessionContext } from "../state";

function mergeSessionIdentity(
  entities: IntentEntities,
  sessionContext: SessionContext,
  acceptedFields: Array<"orderId" | "customerId">
): IntentEntities {
  const merged = { ...entities };
  for (const field of acceptedFields) {
    if (!merged[field] && sessionContext[field]) {
      merged[field] = sessionContext[field] as string;
    }
  }
  return merged;
}

function hasAnyAcceptedField(entities: IntentEntities, acceptedFields: Array<"orderId" | "customerId">): boolean {
  return acceptedFields.some((field) => Boolean(entities[field]));
}

/**
 * LangGraph node: runs right after planning, before execution. For every
 * task whose tool is registered in IDENTITY_REQUIREMENTS, it must know who
 * or what it's looking up before it may run:
 *
 * 1. Use the identifier if the user already gave it this turn.
 * 2. Otherwise fill it in from what this conversation remembers
 *    (sessionContext, supplied by the route from prior turns).
 * 3. Otherwise stop — the first such still-missing task blocks the whole
 *    plan and produces a clarificationRequest asking for exactly that
 *    identifier. Nothing downstream runs, and no tool is ever called with
 *    a guessed/defaulted identity.
 */
export async function identityGateNode(state: ChatState): Promise<ChatStateUpdate> {
  const resolvedTasks: PlannedTask[] = [];

  for (const task of state.executionPlan.tasks) {
    const requirement = IDENTITY_REQUIREMENTS[task.tool];
    if (!requirement) {
      resolvedTasks.push(task);
      continue;
    }

    const mergedEntities = mergeSessionIdentity(task.entities, state.sessionContext, requirement.acceptedFields);

    if (!hasAnyAcceptedField(mergedEntities, requirement.acceptedFields)) {
      return {
        executionPlan: { tasks: resolvedTasks.concat(task), executionMode: state.executionPlan.executionMode },
        clarificationRequest: {
          taskId: task.taskId,
          intent: task.intent,
          agent: task.agent,
          tool: task.tool,
          acceptedFields: requirement.acceptedFields,
          question: requirement.question,
          entities: mergedEntities,
        },
      };
    }

    resolvedTasks.push({ ...task, entities: mergedEntities });
  }

  return {
    executionPlan: { tasks: resolvedTasks, executionMode: state.executionPlan.executionMode },
    clarificationRequest: null,
  };
}

export function routeAfterIdentityGate(state: ChatState): string {
  return state.clarificationRequest ? "buildResponse" : "scheduler";
}
