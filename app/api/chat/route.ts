import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getChatbotGraph } from "@/lib/graph/chatbot.graph";
import "@/lib/mcp/agentRegistry";
import { extractIdentifier } from "@/lib/graph/session/identifierExtraction";
import { getSession, recordTurn, updateSession } from "@/lib/graph/session/conversationStore";
import type { ChatState } from "@/lib/graph/state";
import { describeGraphUpdate } from "@/lib/graph/streamLabels";
import { ChatRequestSchema, ChatResponseSchema, type ChatResponse, type ChatStreamEvent } from "@/lib/schemas/chat";
import type { DetectedIntent } from "@/lib/schemas/intent";

function encodeEvent(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function singleEventStream(event: ChatStreamEvent, response: ChatResponse): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encodeEvent(event));
      controller.enqueue(encodeEvent({ type: "done", response }));
      controller.close();
    },
  });
}

function streamResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function buildChatResponse(finalState: ChatState, conversationId: string): ChatResponse {
  // No task actually ran when the turn was blocked on a clarification question.
  const usedAgents = finalState.clarificationRequest
    ? []
    : Array.from(new Set(finalState.executionPlan.tasks.map((task) => task.agent)));
  const intents = Array.from(new Set(finalState.intents.map((intent) => intent.intent)));
  const includeDebug = process.env.DISABLE_DEBUG_INFO !== "true";

  const response: ChatResponse = {
    message:
      finalState.finalResponse || "I couldn't generate a response for that. Could you try rephrasing?",
    conversationId,
    usedAgents,
    intents,
    uiActions: finalState.uiActions,
    debug: includeDebug
      ? {
          intents,
          executionPlan: finalState.executionPlan.tasks.map((task) => ({
            taskId: task.taskId,
            intent: task.intent,
            agent: task.agent,
            tool: task.tool,
            dependsOn: task.dependsOn,
            status: finalState.agentResults.some((result) => result.taskId === task.taskId)
              ? ("SUCCESS" as const)
              : finalState.errors.some((error) => error.taskId === task.taskId)
                ? ("FAILED" as const)
                : ("SKIPPED" as const),
          })),
          agents: usedAgents,
          tools: Array.from(new Set(finalState.executionPlan.tasks.map((task) => task.tool))),
          executionMode: finalState.executionPlan.executionMode,
          errors: finalState.errors.map((error) => ({
            stage: error.stage,
            message: error.message,
            tool: error.tool,
          })),
        }
      : undefined,
  };

  const validated = ChatResponseSchema.safeParse(response);
  if (!validated.success) {
    console.error("[CHAT] Response failed schema validation", validated.error.issues);
    return { message: response.message, conversationId, usedAgents, intents, uiActions: [] };
  }
  return validated.data;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsedRequest = ChatRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid chat request", details: parsedRequest.error.issues },
      { status: 400 }
    );
  }

  const { message, conversationId: existingConversationId } = parsedRequest.data;
  const conversationId = existingConversationId ?? randomUUID();
  const session = getSession(conversationId);
  // Snapshot before recording this turn, so it's "everything before now" for the intent detector.
  const historyBeforeThisTurn = session.recentTurns;
  recordTurn(conversationId, "user", message);

  // Resuming a pending "which Order ID / Customer ID?" clarification: interpret this
  // message as the answer rather than running it through fresh intent detection.
  let skipIntentDetection = false;
  let presetIntents: DetectedIntent[] = [];

  if (session.pendingClarification) {
    const pending = session.pendingClarification;
    const extracted = extractIdentifier(message, pending.acceptedFields);

    if (!extracted) {
      const retryMessage = `Sorry, I couldn't quite catch that. ${pending.question}`;
      recordTurn(conversationId, "assistant", retryMessage);
      return streamResponse(
        singleEventStream(
          { type: "token", text: retryMessage },
          { message: retryMessage, conversationId, usedAgents: [], intents: [], uiActions: [] }
        )
      );
    }

    updateSession(conversationId, {
      rememberedCustomerId: extracted.field === "customerId" ? extracted.value : session.rememberedCustomerId,
      rememberedOrderId: extracted.field === "orderId" ? extracted.value : session.rememberedOrderId,
      pendingClarification: undefined,
    });

    skipIntentDetection = true;
    presetIntents = [
      {
        intent: pending.intent,
        entities: { ...pending.entities, [extracted.field]: extracted.value },
      },
    ];
  }

  const graph = getChatbotGraph();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const fallbackResponse: ChatResponse = {
        message: "Something went wrong while processing your request. Please try again.",
        conversationId,
        usedAgents: [],
        intents: [],
        uiActions: [],
      };

      let finalState: ChatState | undefined;
      const announcedStatuses = new Set<string>();

      try {
        const events = await graph.stream(
          {
            userQuery: message,
            conversationId,
            skipIntentDetection,
            presetIntents,
            sessionContext: {
              customerId: session.rememberedCustomerId,
              orderId: session.rememberedOrderId,
            },
            conversationHistory: historyBeforeThisTurn,
          },
          { streamMode: ["updates", "custom", "values"] }
        );

        for await (const item of events) {
          const [mode, payload] = item as [string, unknown];

          if (mode === "updates") {
            const entries = Object.entries(payload as Record<string, Record<string, unknown>>);
            const [nodeName, update] = entries[0] ?? [];
            if (nodeName) {
              const label = describeGraphUpdate(nodeName, update ?? {});
              const key = `${nodeName}:${label}`;
              if (label && !announcedStatuses.has(key)) {
                announcedStatuses.add(key);
                controller.enqueue(encodeEvent({ type: "status", label }));
              }
            }
          } else if (mode === "custom") {
            const chunk = payload as { type?: string; text?: string };
            if (chunk?.type === "token" && typeof chunk.text === "string") {
              controller.enqueue(encodeEvent({ type: "token", text: chunk.text }));
            }
          } else if (mode === "values") {
            finalState = payload as ChatState;
          }
        }
      } catch (error) {
        console.error("[CHAT] Unhandled graph execution error", error);
        recordTurn(conversationId, "assistant", fallbackResponse.message);
        controller.enqueue(encodeEvent({ type: "done", response: fallbackResponse }));
        controller.close();
        return;
      }

      if (!finalState) {
        recordTurn(conversationId, "assistant", fallbackResponse.message);
        controller.enqueue(encodeEvent({ type: "done", response: fallbackResponse }));
        controller.close();
        return;
      }

      // Remember any identifiers this turn resolved (directly or via clarification) for future turns.
      for (const task of finalState.executionPlan.tasks) {
        if (task.entities.customerId) {
          updateSession(conversationId, { rememberedCustomerId: task.entities.customerId });
        }
        if (task.entities.orderId) {
          updateSession(conversationId, { rememberedOrderId: task.entities.orderId });
        }
      }

      if (finalState.clarificationRequest) {
        updateSession(conversationId, { pendingClarification: finalState.clarificationRequest });
      } else {
        updateSession(conversationId, { pendingClarification: undefined });
      }

      const chatResponse = buildChatResponse(finalState, conversationId);
      recordTurn(conversationId, "assistant", chatResponse.message);
      controller.enqueue(encodeEvent({ type: "done", response: chatResponse }));
      controller.close();
    },
  });

  return streamResponse(stream);
}
