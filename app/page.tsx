import { ChatApp } from "@/components/chat/ChatApp";

export default function Home() {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-5xl flex-col p-4">
      <ChatApp />
    </div>
  );
}
