import type { UiAction } from "@/lib/schemas/chat";
import { CreateCatalogButton } from "./CreateCatalogButton";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  uiActions?: UiAction[];
  isError?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  onCatalogConfirmed: (message: string) => void;
}

export function ChatMessage({ message, onCatalogConfirmed }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
          isUser
            ? "bg-black text-white dark:bg-white dark:text-black"
            : message.isError
              ? "border border-red-200 bg-red-50 text-red-700"
              : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
        }`}
      >
        {message.content}
        {message.uiActions?.map((action) =>
          action.type === "CREATE_CATALOG_BUTTON" ? (
            <div key={action.type}>
              <CreateCatalogButton onConfirmed={onCatalogConfirmed} />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
