export function StatusIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-500">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neutral-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-neutral-500" />
      </span>
      <span key={label} className="animate-[fadein_0.2s_ease-in]">
        {label}
      </span>
      <style>{`
        @keyframes fadein {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
