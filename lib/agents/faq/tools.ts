import type { MCPToolDefinition } from "@/lib/mcp/types";
import { faqApiRepository } from "@/lib/repositories/api/faq.api";
import {
  GetFaqAnswerInputSchema,
  GetFaqAnswerOutputSchema,
  type GetFaqAnswerToolInput,
  type GetFaqAnswerToolOutput,
} from "./schemas";

/** Independent FAQ capability. Never registered under OneStore, per the build spec. */
export const getFaqAnswerTool: MCPToolDefinition<GetFaqAnswerToolInput, GetFaqAnswerToolOutput> = {
  name: "getFaqAnswer",
  description:
    "Answer a general ordering, sample, imprint, artwork, pricing, production, shipping, returns or payment FAQ question.",
  domain: "FAQ",
  agent: "FAQ_AGENT",
  inputSchema: GetFaqAnswerInputSchema,
  outputSchema: GetFaqAnswerOutputSchema,
  handler: (input) => faqApiRepository.getFaqAnswer(input),
};

export const faqTools = [getFaqAnswerTool];
