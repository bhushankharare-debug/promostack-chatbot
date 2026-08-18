"use client";

import type { ConversationRecord } from "./conversationStorage";

interface ChatSidebarProps {
  conversations: ConversationRecord[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ conversations, activeId, onSelect, onNewChat }: ChatSidebarProps) {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="p-3">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-left text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          + New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-neutral-400">Recents</p>
        {sorted.length === 0 ? (
          <p className="px-2 py-2 text-sm text-neutral-400">No conversations yet</p>
        ) : (
          <ul className="space-y-0.5">
            {sorted.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  title={conversation.title}
                  className={`block w-full truncate rounded-md px-2 py-2 text-left text-sm ${
                    conversation.id === activeId
                      ? "bg-neutral-200 dark:bg-neutral-800"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  }`}
                >
                  {conversation.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
