import type { AgentName, DomainName } from "@/lib/schemas/tool";
import { oneStoreTools } from "./tools";

export const oneStoreAgent = {
  name: "ONESTORE_AGENT" as AgentName,
  domain: "ONE_STORE" as DomainName,
  description: "Owns product discovery, inventory and order placement. Does not own FAQ lookup.",
  tools: oneStoreTools,
};
