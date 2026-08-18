import type { AgentName, DomainName } from "@/lib/schemas/tool";
import { oneCatalogTools } from "./tools";

export const oneCatalogAgent = {
  name: "ONECATALOG_AGENT" as AgentName,
  domain: "ONE_CATALOG" as DomainName,
  description: "Owns catalog creation (UI-confirmed), credit balance and flyer performance.",
  tools: oneCatalogTools,
};
