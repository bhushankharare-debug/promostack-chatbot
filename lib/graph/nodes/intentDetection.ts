import { getChatModel } from "@/lib/ai/openai";
import { IntentDetectionOutputSchema, type IntentDetectionOutput } from "@/lib/schemas/intent";
import { CAPABILITY_MAP } from "@/lib/schemas/tool";
import type { ChatState, ChatStateUpdate } from "../state";

function buildSystemPrompt(hasHistory: boolean): string {
  const capabilityLines = Object.values(CAPABILITY_MAP)
    .map((capability) => `- ${capability.intent}: ${capability.description} (agent: ${capability.agent})`)
    .join("\n");

  return [
    "You are the intent detector for a multi-agent chatbot.",
    "Identify every distinct capability request in the user's message. A message can contain more than one.",
    "You may ONLY choose intents from this exact registered list — never invent a new intent name:",
    capabilityLines,
    "For each intent, extract any entities the user mentioned that are relevant to it.",
    "Leave entity fields empty if the user did not mention them. Never guess or invent IDs, SKUs, or amounts.",
    "If none of the registered capabilities genuinely match the user's message, return an empty intents array — never force a mismatched guess.",
    hasHistory
      ? "Recent conversation turns are included above the current message for context. If the current message is a short reply that only makes sense as an answer to the assistant's last question (e.g. it's just an ID with no other content), interpret it as continuing THAT SAME topic/intent — do not default to a different, unrelated capability just because a bare identifier alone looks ambiguous."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * LangGraph node: NLU / intent detection. Uses OpenAI through LangChain
 * with structured output, so the model can only select from the registered
 * intent enum — Zod validates the shape before anything downstream trusts it.
 *
 * Recent conversation history is included as real prior turns (not just a
 * side-channel session lookup) specifically so a short, otherwise-ambiguous
 * reply is grounded in what was actually just asked. This is a fallback:
 * the normal path resumes a pending clarification deterministically via
 * skipIntentDetection/presetIntents; this only matters when that session
 * state isn't available for some reason, so a bare identifier doesn't get
 * silently misinterpreted as an unrelated request.
 */
export async function detectIntentNode(state: ChatState): Promise<ChatStateUpdate> {
  if (state.skipIntentDetection) {
    return { intents: state.presetIntents };
  }

  const structuredModel = getChatModel().withStructuredOutput(IntentDetectionOutputSchema, {
    name: "intent_detection",
  });

  const historyMessages: Array<["human" | "ai", string]> = state.conversationHistory.map((turn) => [
    turn.role === "user" ? "human" : "ai",
    turn.content,
  ]);

  let output: IntentDetectionOutput;
  try {
    output = await structuredModel.invoke([
      ["system", buildSystemPrompt(historyMessages.length > 0)],
      ...historyMessages,
      ["human", state.userQuery],
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Intent detection failed";
    return {
      intents: [],
      errors: [
        {
          stage: "INTENT_DETECTION",
          message,
          occurredAt: new Date().toISOString(),
        },
      ],
    };
  }

  return { intents: output.intents };
}
