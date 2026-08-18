"use client";

import { useState, type KeyboardEvent } from "react";

interface ChatInputProps {
  disabled: boolean;
  onSend: (message: string) => void;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="Type your message..."
        className="flex-1 resize-none rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 disabled:opacity-50 dark:border-neutral-700"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        Send
      </button>
    </div>
  );
}
