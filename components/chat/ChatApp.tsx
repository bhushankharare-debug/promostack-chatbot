"use client";

import { useEffect, useState } from "react";
import type { ChatMessageData } from "./ChatMessage";
import { ChatSidebar } from "./ChatSidebar";
import {
  createConversationId,
  createEmptyConversation,
  deriveTitle,
  loadConversations,
  saveConversations,
  type ConversationRecord,
} from "./conversationStorage";
import { ChatWindow } from "./ChatWindow";

/**
 * Owns the list of conversations and which one is active. Renders a
 * "Loading…" placeholder on first paint (identical on server and client)
 * so reading localStorage after mount never causes a hydration mismatch.
 */
export function ChatApp() {
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect --
       One-time hydration from an external system (localStorage), not derived
       React state — exactly the case this rule's own guidance calls a
       legitimate effect use. It can't be a lazy useState initializer instead:
       that runs during SSR/the client's first hydration pass too and would
       diverge from the server-rendered markup. */
    const stored = loadConversations();
    if (stored.length > 0) {
      setConversations(stored);
      setActiveId(stored.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
    } else {
      const fresh = createEmptyConversation(createConversationId());
      setConversations([fresh]);
      setActiveId(fresh.id);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) saveConversations(conversations);
  }, [conversations, hydrated]);

  function handleNewChat() {
    const fresh = createEmptyConversation(createConversationId());
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
  }

  function handleMessagesChange(updater: (prev: ChatMessageData[]) => ChatMessageData[]) {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== activeId) return conversation;
        const nextMessages = updater(conversation.messages);
        const firstUserMessage = nextMessages.find((message) => message.role === "user");
        return {
          ...conversation,
          messages: nextMessages,
          title: firstUserMessage ? deriveTitle(firstUserMessage.content) : conversation.title,
          updatedAt: Date.now(),
        };
      })
    );
  }

  const activeConversation = conversations.find((conversation) => conversation.id === activeId);

  if (!hydrated || !activeConversation) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={handleNewChat}
      />
      <ChatWindow
        key={activeConversation.id}
        conversationId={activeConversation.id}
        messages={activeConversation.messages}
        onMessagesChange={handleMessagesChange}
      />
    </div>
  );
}
