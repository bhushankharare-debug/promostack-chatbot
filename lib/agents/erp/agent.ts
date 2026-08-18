import type { AgentName, DomainName } from "@/lib/schemas/tool";
import { erpTools } from "./tools";

/**
 * ERP Agent: owns order status and best-selling item reporting only. Never
 * calls another agent — the orchestrator is the sole coordinator.
 */
export const erpAgent = {
  name: "ERP_AGENT" as AgentName,
  domain: "ERP" as DomainName,
  description: "Owns ERP order status and best-selling item reporting.",
  tools: erpTools,
};
