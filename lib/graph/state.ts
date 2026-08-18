import { Annotation } from "@langchain/langgraph";
import type { AgentError } from "@/lib/schemas/agentError";
import type { AgentResult } from "@/lib/schemas/agentResult";
import type { DetectedIntent } from "@/lib/schemas/intent";
import type { ExecutionPlan, PlannedTask } from "@/lib/schemas/executionPlan";
import type { UiAction } from "@/lib/schemas/chat";
import type { ConversationTurn, PendingClarification } from "./session/conversationStore";

export interface SessionContext {
  customerId?: string;
  orderId?: string;
}

/**
 * Typed LangGraph state shared by every node. Array fields (agentResults,
 * errors) use a concat reducer so that parallel task branches, which each
 * return a partial update, merge instead of clobbering one another.
 */
export const ChatStateAnnotation = Annotation.Root({
  userQuery: Annotation<string>,
  conversationId: Annotation<string>,

  intents: Annotation<DetectedIntent[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),

  executionPlan: Annotation<ExecutionPlan>({
    reducer: (_left, right) => right,
    default: () => ({ tasks: [], executionMode: "SINGLE" }),
  }),

  agentResults: Annotation<AgentResult[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),

  errors: Annotation<AgentError[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),

  finalResponse: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),

  uiActions: Annotation<UiAction[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),

  /**
   * Ephemeral, set per-invocation by a Send() dispatch from the router to
   * tell one parallel "runTask" branch which single task it owns. Send()'s
   * args become the *entire* input that invocation of the node receives —
   * other channels are not merged in — so any context a task needs from an
   * upstream result must be resolved by the router beforehand and passed
   * alongside it (see resolvedContext).
   */
  taskToRun: Annotation<PlannedTask | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),

  /** Ephemeral, paired with taskToRun: upstream field values already resolved for this one task by the router. */
  resolvedContext: Annotation<Record<string, unknown>>({
    reducer: (_left, right) => right,
    default: () => ({}),
  }),

  /** Input: identifiers remembered from earlier turns in this conversation (route-supplied, read-only within the graph). */
  sessionContext: Annotation<SessionContext>({
    reducer: (_left, right) => right,
    default: () => ({}),
  }),

  /**
   * Input: the last few turns of this conversation, oldest first — a
   * grounding fallback for intent detection so a short reply (e.g. a bare
   * customer ID) can still be interpreted correctly even if pendingClarification
   * was somehow lost. See conversationStore.ts's ConversationSession docs.
   */
  conversationHistory: Annotation<ConversationTurn[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),

  /** Input: when true, detectIntent skips the LLM call and uses presetIntents instead — used to resume after a clarification answer. */
  skipIntentDetection: Annotation<boolean>({
    reducer: (_left, right) => right,
    default: () => false,
  }),

  /** Input: the single reconstructed intent to resume with, paired with skipIntentDetection. */
  presetIntents: Annotation<DetectedIntent[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),

  /** Output: set when a task is missing a required identity field the bot must not guess — short-circuits straight to the response builder. */
  clarificationRequest: Annotation<PendingClarification | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
});

export type ChatState = typeof ChatStateAnnotation.State;
export type ChatStateUpdate = typeof ChatStateAnnotation.Update;
