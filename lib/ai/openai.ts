import { ChatOpenAI } from "@langchain/openai";

let cachedModel: ChatOpenAI | null = null;

/**
 * Single place OpenAI-compatible clients get constructed. Works against
 * OpenAI directly by default; set OPENAI_BASE_URL to point at any
 * OpenAI-API-compatible provider instead (e.g. OpenRouter) without touching
 * any other code — OPENAI_MODEL then needs that provider's model id (e.g.
 * OpenRouter wants "openai/gpt-4o-mini", not "gpt-4o-mini").
 */
export function getChatModel(): ChatOpenAI {
  if (cachedModel) return cachedModel;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Copy .env.example to .env.local and add your key.");
  }

  const baseURL = process.env.OPENAI_BASE_URL;
  const isOpenRouter = baseURL?.includes("openrouter.ai") ?? false;

  cachedModel = new ChatOpenAI({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0,
    configuration: baseURL
      ? {
          baseURL,
          // Optional OpenRouter attribution headers — https://openrouter.ai/docs — harmless no-ops elsewhere, so only sent when actually pointed at OpenRouter.
          ...(isOpenRouter
            ? {
                defaultHeaders: {
                  "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
                  "X-Title": "MCP Multi-Agent Chatbot POC",
                },
              }
            : {}),
        }
      : undefined,
  });
  return cachedModel;
}
