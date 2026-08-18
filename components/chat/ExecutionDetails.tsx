"use client";

import { useState } from "react";
import type { DebugExecution } from "@/lib/schemas/chat";

export function ExecutionDetails({ debug }: { debug: DebugExecution }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-xs text-neutral-500">
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="underline">
        {open ? "Hide execution details" : "Show execution details"}
      </button>
      {open && (
        <pre className="mt-1 max-h-48 max-w-full overflow-auto rounded-md bg-neutral-50 p-2 text-[11px] dark:bg-neutral-900">
          {JSON.stringify(debug, null, 2)}
        </pre>
      )}
    </div>
  );
}
