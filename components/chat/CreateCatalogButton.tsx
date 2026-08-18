"use client";

import { useState } from "react";

interface CreateCatalogButtonProps {
  onConfirmed: (message: string) => void;
}

/**
 * Per the build spec's Correction 2: clicking this calls a dedicated POC
 * endpoint that returns a static mock confirmation. Nothing is persisted.
 */
export function CreateCatalogButton({ onConfirmed }: CreateCatalogButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      const response = await fetch("/api/onecatalog/create-catalog", { method: "POST" });
      const data = await response.json();
      setStatus("done");
      onConfirmed(data.popupMessage ?? "Catalog created successfully.");
    } catch {
      setStatus("idle");
      onConfirmed("Sorry, something went wrong creating the catalog. Please try again.");
    }
  }

  if (status === "done") return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "loading"}
      className="mt-2 inline-flex items-center rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
    >
      {status === "loading" ? "Creating..." : "Create Catalog"}
    </button>
  );
}
