import type { IntentEntities } from "@/lib/schemas/intent";
import type { AgentName, IntentName, ToolName } from "@/lib/schemas/tool";

/**
 * A question the bot asked and is waiting on an answer for, so the next
 * message in this conversation can be interpreted as a reply rather than a
 * fresh request.
 */
export interface PendingClarification {
  taskId: string;
  intent: IntentName;
  agent: AgentName;
  tool: ToolName;
  /** Fields the reply may fill in — in priority order. */
  acceptedFields: Array<"orderId" | "customerId">;
  question: string;
  /** The task's entities as already known, missing only the identity field(s). */
  entities: IntentEntities;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY_TURNS = 6;

export interface ConversationSession {
  rememberedCustomerId?: string;
  rememberedOrderId?: string;
  pendingClarification?: PendingClarification;
  /**
   * Last few turns, oldest first — a grounding fallback for intent
   * detection. If pendingClarification is ever lost (e.g. an environment
   * that recycles server processes/instances between requests), a short
   * reply like a bare customer ID is otherwise indistinguishable from a
   * brand-new, context-free request, and an LLM will confidently guess the
   * wrong intent rather than admit it doesn't know. Recent history lets
   * intent detection see what was actually just asked.
   */
  recentTurns: ConversationTurn[];
}

function createEmptySession(): ConversationSession {
  return { recentTurns: [] };
}

/**
 * In-memory conversation memory keyed by conversationId. POC scope only —
 * per the build spec, no database is introduced here; a real deployment
 * would back this with persistent, per-user conversation storage without
 * changing how the graph/route consume it.
 *
 * Stashed on `globalThis` (not a plain module-level `Map`) so it survives
 * Next.js dev-mode hot module reloads, which re-evaluate route modules on
 * every edit and would otherwise silently reset a plain module-level Map
 * mid-conversation — turning a real multi-turn feature into something that
 * only works until the next file save. This does not make it durable across
 * an actual process restart or multiple server instances; recentTurns is
 * the fallback for when session state genuinely isn't available.
 */
declare global {
  var __chatbotConversationSessions: Map<string, ConversationSession> | undefined;
}

const sessions: Map<string, ConversationSession> =
  globalThis.__chatbotConversationSessions ?? new Map<string, ConversationSession>();
globalThis.__chatbotConversationSessions = sessions;

export function getSession(conversationId: string): ConversationSession {
  let session = sessions.get(conversationId);
  if (!session) {
    session = createEmptySession();
    sessions.set(conversationId, session);
  }
  return session;
}

export function updateSession(conversationId: string, patch: Partial<ConversationSession>): void {
  const session = getSession(conversationId);
  Object.assign(session, patch);
}

export function recordTurn(conversationId: string, role: ConversationTurn["role"], content: string): void {
  const session = getSession(conversationId);
  session.recentTurns = [...session.recentTurns, { role, content }].slice(-MAX_HISTORY_TURNS);
}
