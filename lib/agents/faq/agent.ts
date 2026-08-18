import type { AgentName, DomainName } from "@/lib/schemas/tool";
import { faqTools } from "./tools";

/** FAQ Agent: independent domain/service, isolated from OneStore. */
export const faqAgent = {
  name: "FAQ_AGENT" as AgentName,
  domain: "FAQ" as DomainName,
  description: "Owns general FAQ lookups (MOQ, imprint methods, shipping, returns, etc.).",
  tools: faqTools,
};
