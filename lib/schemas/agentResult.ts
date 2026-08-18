import { z } from "zod";
import { AgentNameSchema, IntentNameSchema, ToolNameSchema } from "./tool";

export const AgentResultSchema = z.object({
  taskId: z.string(),
  intent: IntentNameSchema,
  agent: AgentNameSchema,
  tool: ToolNameSchema,
  status: z.literal("SUCCESS"),
  /** The (pre-validation) input actually submitted to the tool — e.g. which customerId/orderId was looked up. Lets the response builder name the specific identifier when a lookup comes back empty, instead of a vague "nothing found". */
  input: z.unknown(),
  data: z.unknown(),
  startedAt: z.string(),
  completedAt: z.string(),
});
export type AgentResult = z.infer<typeof AgentResultSchema>;
