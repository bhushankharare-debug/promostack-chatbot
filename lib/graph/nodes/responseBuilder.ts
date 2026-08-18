import { getWriter } from "@langchain/langgraph";
import { z } from "zod";
import { getChatModel } from "@/lib/ai/openai";
import type { UiAction } from "@/lib/schemas/chat";
import { CAPABILITY_MAP } from "@/lib/schemas/tool";
import type { ChatState, ChatStateUpdate } from "../state";

function summarizeForPrompt(state: ChatState): string {
  const successes = state.agentResults.map((result) => ({
    intent: result.intent,
    tool: result.tool,
    // The identifier(s) actually looked up (e.g. customerId/orderId) — included
    // specifically so an empty/null `data` can still be explained by name
    // instead of a vague "nothing found".
    lookedUpWith: result.input,
    data: result.data,
  }));
  const failures = state.errors.map((error) => ({
    intent: error.intent,
    tool: error.tool,
    reason: error.message,
  }));
  return JSON.stringify({ successes, failures }, null, 2);
}

function buildCapabilitySummary(): string {
  const byDomain = new Map<string, string[]>();
  for (const capability of Object.values(CAPABILITY_MAP)) {
    const descriptions = byDomain.get(capability.domain) ?? [];
    descriptions.push(capability.description);
    byDomain.set(capability.domain, descriptions);
  }
  return Array.from(byDomain.values())
    .flat()
    .map((description) => `- ${description}`)
    .join("\n");
}

const NO_CAPABILITY_SYSTEM_PROMPT = [
  "You are the friendly front door of a retail/ERP chatbot.",
  "The user's message didn't match any of the bot's capabilities, listed below.",
  "If it's a greeting, thanks, small talk, or a question about what you can do (e.g. 'hi', 'hello', 'thanks', 'who are you', 'what can you do'), reply warmly and briefly summarize what you can help with — never say the message was unsupported, unmatched, or that you couldn't find something.",
  "If it's a genuine but out-of-scope request, politely say you can't help with that specific thing, then briefly mention what you can help with instead.",
  "Keep it short, warm, and conversational. Plain text only — no markdown, no bullet dashes.",
  "Never use internal/technical words like 'intent', 'capability', 'registered', 'agent', or 'tool'.",
  "",
  "What you can help with:",
  buildCapabilitySummary(),
].join("\n");

const NO_CAPABILITY_FALLBACK =
  "Hi! I can help with order status, catalog credit balance, best performing flyers, product search, inventory, placing orders, and general FAQs. What would you like to do?";

function buildFallbackResponse(state: ChatState): string {
  if (state.agentResults.length === 0 && state.errors.length > 0) {
    return "Sorry, I wasn't able to complete that request right now. Please try again in a moment.";
  }
  if (state.agentResults.length === 0) {
    return "I'm not sure how to help with that yet. Could you rephrase your question?";
  }
  return state.agentResults.map((result) => `${result.intent}: ${JSON.stringify(result.data)}`).join("\n");
}

/**
 * Decides whether to offer the Create Catalog button — a small, fast,
 * non-streamed structured call, run *before* the prose message is written
 * (and only when a createCatalog result actually exists), so the streamed
 * message can be told the decision up front and stay consistent with it.
 * A user who says "create a catalog, but only if I have enough credit" must
 * get a message AND a button decision that agree with each other; deciding
 * first and writing second (rather than one combined call) is what makes
 * that possible while still letting the message stream token by token.
 */
const ButtonDecisionSchema = z.object({
  offerCreateCatalogButton: z
    .boolean()
    .describe(
      "True only if it is appropriate to offer catalog creation given the user's full request and the data. If the user stated a condition (e.g. 'only if I have enough credit') and the data shows that condition is not met, set this to false."
    ),
});

async function decideCreateCatalogButton(state: ChatState): Promise<boolean> {
  if (!state.agentResults.some((result) => result.tool === "createCatalog")) return false;
  try {
    const structuredModel = getChatModel().withStructuredOutput(ButtonDecisionSchema, {
      name: "catalog_button_decision",
    });
    const result = await structuredModel.invoke([
      [
        "system",
        "You decide whether a Create Catalog button should be shown to the user, given their request and a JSON summary of internal tool results.",
      ],
      ["human", `User's question: ${state.userQuery}\n\nResults:\n${summarizeForPrompt(state)}`],
    ]);
    return result.offerCreateCatalogButton;
  } catch {
    return false;
  }
}

function buildProseSystemPrompt(offerCreateCatalogButton: boolean, catalogResultPresent: boolean): string {
  return [
    "You write the final reply for a multi-agent retail/ERP chatbot.",
    "You are given the user's original question and a JSON summary of successful and failed internal tool results.",
    "Write a clear, friendly, natural-language answer that directly addresses the user's question using only the successful results.",
    "If there are failures, briefly and gracefully mention what could not be retrieved — never expose internal stage names, stack traces, or raw JSON.",
    "Never invent data that isn't present in the successful results.",
    catalogResultPresent
      ? offerCreateCatalogButton
        ? "A Create Catalog button WILL be shown below your message — mention they can click it to confirm. Do not claim the catalog already exists."
        : "No Create Catalog button will be shown, because a condition the user stated wasn't met by the data (e.g. insufficient credit). Clearly explain why in your message."
      : "",
    "Keep it concise and conversational. Never mention agents, tools, orchestration, or JSON explicitly.",
    "Write in plain text only — no markdown (no **bold**, no #, no markdown bullets/dashes). Use plain sentences and, if listing multiple items, simple numbered lines like '1. ...'.",
    "Each successful result includes lookedUpWith (the identifier(s), e.g. customerId/orderId, actually used for that lookup). If a result's data is empty/null (nothing found), you MUST name the specific ID from lookedUpWith in your message — e.g. \"I couldn't find a flyer for customer CUST-10890\" — never say just 'nothing found' or 'try again later' without naming which ID was checked, since the user needs to know whether to correct it.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Forwards one chunk of streamed reply text to whoever is consuming the graph's "custom" stream (the chat route). A no-op if nothing is consuming that stream (e.g. a plain graph.invoke() call, such as in tests). */
function emitToken(text: string): void {
  if (!text) return;
  try {
    // getWriter() (not the bare writer() helper) — writer() only checks
    // config.configurable.writer, but the Pregel runtime actually sets the
    // custom-mode writer at the top-level config.writer, which only
    // getWriter() checks. Using writer() here silently no-ops forever.
    const write = getWriter();
    write?.({ type: "token", text });
  } catch {
    // Not running under a stream consumer (e.g. a plain graph.invoke() call) — safe to ignore.
  }
}

/** Streams a chat completion token by token, forwarding each chunk via emitToken, and returns the full accumulated text. */
async function streamProse(systemPrompt: string, humanPrompt: string): Promise<string> {
  let full = "";
  const stream = await getChatModel().stream([
    ["system", systemPrompt],
    ["human", humanPrompt],
  ]);
  for await (const chunk of stream) {
    const text = typeof chunk.content === "string" ? chunk.content : "";
    if (text) {
      full += text;
      emitToken(text);
    }
  }
  return full;
}

/**
 * LangGraph node: response builder. Streams the final natural-language
 * reply token by token (via the graph's custom stream writer) while it's
 * generated, handles partial failures gracefully, and derives any UI
 * actions (e.g. the Create Catalog button) from a decision made *before*
 * the message is written, so the two never disagree. Falls back to a safe
 * templated response (written as a single chunk, button never offered) if
 * the LLM call itself fails, per the spec's response-builder-failure
 * requirement.
 */
export async function buildResponseNode(state: ChatState): Promise<ChatStateUpdate> {
  if (state.clarificationRequest) {
    emitToken(state.clarificationRequest.question);
    return { finalResponse: state.clarificationRequest.question, uiActions: [] };
  }

  if (state.agentResults.length === 0 && state.errors.length === 0) {
    try {
      const message = await streamProse(NO_CAPABILITY_SYSTEM_PROMPT, state.userQuery);
      return { finalResponse: message, uiActions: [] };
    } catch {
      emitToken(NO_CAPABILITY_FALLBACK);
      return { finalResponse: NO_CAPABILITY_FALLBACK, uiActions: [] };
    }
  }

  const catalogResultPresent = state.agentResults.some((result) => result.tool === "createCatalog");
  const offerCreateCatalogButton = await decideCreateCatalogButton(state);
  const uiActions: UiAction[] = offerCreateCatalogButton
    ? [{ type: "CREATE_CATALOG_BUTTON", label: "Create Catalog" }]
    : [];

  const humanPrompt = `User's question: ${state.userQuery}\n\nResults:\n${summarizeForPrompt(state)}`;

  try {
    const message = await streamProse(
      buildProseSystemPrompt(offerCreateCatalogButton, catalogResultPresent),
      humanPrompt
    );
    return { finalResponse: message, uiActions };
  } catch {
    const fallback = buildFallbackResponse(state);
    emitToken(fallback);
    return { finalResponse: fallback, uiActions };
  }
}
