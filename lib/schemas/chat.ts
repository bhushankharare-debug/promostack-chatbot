import { z } from "zod";
import { AgentNameSchema, IntentNameSchema, ToolNameSchema } from "./tool";
import { ExecutionModeSchema } from "./executionPlan";

export const ChatRequestSchema = z.object({
  message: z.string().min(1, "message must not be empty"),
  conversationId: z.string().optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const DebugTaskSchema = z.object({
  taskId: z.string(),
  intent: IntentNameSchema,
  agent: AgentNameSchema,
  tool: ToolNameSchema,
  dependsOn: z.array(z.string()),
  status: z.enum(["SUCCESS", "FAILED", "SKIPPED"]),
});

export const DebugErrorSchema = z.object({
  stage: z.string(),
  message: z.string(),
  tool: ToolNameSchema.optional(),
});

export const DebugExecutionSchema = z.object({
  intents: z.array(IntentNameSchema),
  executionPlan: z.array(DebugTaskSchema),
  agents: z.array(AgentNameSchema),
  tools: z.array(ToolNameSchema),
  executionMode: ExecutionModeSchema,
  errors: z.array(DebugErrorSchema),
});
export type DebugExecution = z.infer<typeof DebugExecutionSchema>;

export const UiActionSchema = z.object({
  type: z.literal("CREATE_CATALOG_BUTTON"),
  label: z.string(),
});
export type UiAction = z.infer<typeof UiActionSchema>;

export const ChatResponseSchema = z.object({
  message: z.string(),
  conversationId: z.string(),
  usedAgents: z.array(AgentNameSchema),
  intents: z.array(IntentNameSchema),
  uiActions: z.array(UiActionSchema),
  debug: DebugExecutionSchema.optional(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

/**
 * POST /api/chat streams a sequence of these as newline-delimited JSON
 * (one object per line), not a single JSON body. "status" events reflect
 * real graph progress (see lib/graph/streamLabels.ts); "token" events are
 * chunks of the reply as it's generated; "done" always arrives last and
 * carries the same shape the non-streaming API used to return in full.
 */
export type ChatStreamEvent =
  | { type: "status"; label: string }
  | { type: "token"; text: string }
  | { type: "done"; response: ChatResponse }
  | { type: "error"; message: string };
