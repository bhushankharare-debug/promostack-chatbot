import { z } from "zod";
import { AgentNameSchema, IntentNameSchema, ToolNameSchema } from "./tool";
import { IntentEntitiesSchema } from "./intent";

export const ExecutionModeSchema = z.enum(["SINGLE", "PARALLEL", "SEQUENTIAL", "MIXED"]);
export type ExecutionMode = z.infer<typeof ExecutionModeSchema>;

/** A binding that says: fill task input field `field` from upstream task `fromTaskId`'s output. */
export const ContextBindingSchema = z.object({
  field: z.string(),
  fromTaskId: z.string(),
});
export type ContextBinding = z.infer<typeof ContextBindingSchema>;

export const PlannedTaskSchema = z.object({
  taskId: z.string(),
  intent: IntentNameSchema,
  agent: AgentNameSchema,
  tool: ToolNameSchema,
  entities: IntentEntitiesSchema,
  dependsOn: z.array(z.string()).default([]),
  contextBindings: z.array(ContextBindingSchema).default([]),
  /** True when this task was inserted by domain planning rules rather than detected directly from the user's message (e.g. an inventory check auto-added before placing an order). */
  implicit: z.boolean().default(false),
});
export type PlannedTask = z.infer<typeof PlannedTaskSchema>;

export const ExecutionPlanSchema = z.object({
  tasks: z.array(PlannedTaskSchema),
  executionMode: ExecutionModeSchema,
});
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
