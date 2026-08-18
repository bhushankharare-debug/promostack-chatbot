import type { ChatMessageData } from "./ChatMessage";

export interface ConversationRecord {
  id: string;
  title: string;
  messages: ChatMessageData[];
  updatedAt: number;
}

const STORAGE_KEY = "chatbot-poc-conversations";

/**
 * Chat history is client-side only (localStorage), independent of the
 * server's per-conversationId session memory (lib/graph/session) used for
 * the identity-clarification flow — the two are keyed by the same
 * conversationId but serve different purposes and don't need to share a
 * store. Keeping history client-side avoids introducing a database, per
 * this POC's scope.
 */
export function loadConversations(): ConversationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ConversationRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: ConversationRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // Storage full/unavailable — non-fatal for a POC, history just won't persist.
  }
}

export function deriveTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New chat";
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
}

export function createEmptyConversation(id: string): ConversationRecord {
  return { id, title: "New chat", messages: [], updatedAt: Date.now() };
}

export function createConversationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
