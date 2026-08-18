import { z } from "zod";
import { AgentNameSchema, IntentNameSchema, ToolNameSchema } from "./tool";

export const ErrorStageSchema = z.enum([
  "INTENT_DETECTION",
  "PLANNING",
  "CAPABILITY_VALIDATION",
  "TOOL_INPUT_VALIDATION",
  "TOOL_EXECUTION",
  "AGENT_EXECUTION",
  "REPOSITORY_ACCESS",
  "DATA_ACCESS",
  "RESPONSE_GENERATION",
]);
export type ErrorStage = z.infer<typeof ErrorStageSchema>;

export const AgentErrorSchema = z.object({
  taskId: z.string().optional(),
  intent: IntentNameSchema.optional(),
  agent: AgentNameSchema.optional(),
  tool: ToolNameSchema.optional(),
  stage: ErrorStageSchema,
  message: z.string(),
  occurredAt: z.string(),
});
export type AgentError = z.infer<typeof AgentErrorSchema>;
