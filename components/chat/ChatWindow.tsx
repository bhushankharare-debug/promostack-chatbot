"use client";

import { useState } from "react";
import type { ChatResponse, ChatStreamEvent } from "@/lib/schemas/chat";
import { ChatInput } from "./ChatInput";
import { ChatMessage, type ChatMessageData } from "./ChatMessage";
import { ExecutionDetails } from "./ExecutionDetails";
import { StatusIndicator } from "./StatusIndicator";

interface ChatWindowProps {
  conversationId: string;
  messages: ChatMessageData[];
  onMessagesChange: (updater: (prev: ChatMessageData[]) => ChatMessageData[]) => void;
}

function createId(): string {
  return Math.random().toString(36).slice(2);
}

/** Reads one newline-delimited JSON event per line from a streaming fetch() response body. */
async function* readChatStream(response: Response): AsyncGenerator<ChatStreamEvent> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      yield JSON.parse(line) as ChatStreamEvent;
    }
  }
  if (buffer.trim()) {
    yield JSON.parse(buffer) as ChatStreamEvent;
  }
}

/**
 * Controlled by its parent (ChatApp): message history lives there (and in
 * localStorage) so switching conversations in the sidebar doesn't lose
 * anything. Only ephemeral per-turn UI state (loading, status label, last
 * debug payload) is local here.
 */
export function ChatWindow({ conversationId, messages, onMessagesChange }: ChatWindowProps) {
  const [loading, setLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [lastDebug, setLastDebug] = useState<ChatResponse["debug"] | undefined>(undefined);

  function appendMessage(message: ChatMessageData) {
    onMessagesChange((prev) => [...prev, message]);
  }

  function updateMessage(id: string, patch: Partial<ChatMessageData>) {
    onMessagesChange((prev) => prev.map((message) => (message.id === id ? { ...message, ...patch } : message)));
  }

  function handleCatalogConfirmed(confirmationMessage: string) {
    appendMessage({ id: createId(), role: "assistant", content: confirmationMessage });
  }

  async function handleSend(text: string) {
    appendMessage({ id: createId(), role: "user", content: text });
    setLoading(true);
    setStatusLabel("Thinking…");

    const assistantMessageId = createId();
    let assistantBubbleAdded = false;
    let streamedText = "";

    function ensureAssistantBubble() {
      if (!assistantBubbleAdded) {
        assistantBubbleAdded = true;
        setStatusLabel(null);
        appendMessage({ id: assistantMessageId, role: "assistant", content: "" });
      }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      for await (const event of readChatStream(response)) {
        if (event.type === "status") {
          setStatusLabel(event.label);
        } else if (event.type === "token") {
          ensureAssistantBubble();
          streamedText += event.text;
          updateMessage(assistantMessageId, { content: streamedText });
        } else if (event.type === "done") {
          setLastDebug(event.response.debug);
          ensureAssistantBubble();
          // Authoritative final text/uiActions — reconciles with the streamed text in case they ever diverge.
          updateMessage(assistantMessageId, {
            content: event.response.message,
            uiActions: event.response.uiActions,
          });
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }

      if (!assistantBubbleAdded) {
        throw new Error("Stream ended without a response");
      }
    } catch {
      if (assistantBubbleAdded) {
        updateMessage(assistantMessageId, {
          content: "Sorry, something went wrong reaching the assistant. Please try again.",
          isError: true,
        });
      } else {
        appendMessage({
          id: createId(),
          role: "assistant",
          content: "Sorry, something went wrong reaching the assistant. Please try again.",
          isError: true,
        });
      }
    } finally {
      setLoading(false);
      setStatusLabel(null);
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-black">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h1 className="text-base font-semibold">Multi-Agent Chatbot</h1>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">
            Try: &quot;What is my order status?&quot; or &quot;Check my catalog credit balance&quot;.
          </p>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} onCatalogConfirmed={handleCatalogConfirmed} />
        ))}
        {loading && statusLabel && <StatusIndicator label={statusLabel} />}
      </div>

      {lastDebug && (
        <div className="border-t border-neutral-200 px-4 py-2 dark:border-neutral-800">
          <ExecutionDetails debug={lastDebug} />
        </div>
      )}

      <ChatInput disabled={loading} onSend={handleSend} />
    </div>
  );
}
