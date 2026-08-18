import { readJsonFile } from "./readJson";
import type { FaqRecord, FaqRepository, GetFaqAnswerInput, GetFaqAnswerOutput } from "../interfaces/faq.repository";

interface FaqServiceFile {
  faqs: FaqRecord[];
}

async function loadData(): Promise<FaqServiceFile> {
  return readJsonFile<FaqServiceFile>("faq_service.json");
}

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "do", "does", "i", "my", "what", "how", "can",
  "you", "for", "of", "to", "in", "on", "and", "or", "with", "will", "if", "me",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function scoreOverlap(queryTokens: string[], text: string): number {
  if (queryTokens.length === 0) return 0;
  const textTokens = new Set(tokenize(text));
  const hits = queryTokens.filter((token) => textTokens.has(token)).length;
  return hits / queryTokens.length;
}

/** JSON-backed implementation of FaqRepository. Used only by the /api/faq route handler. Independent of OneStore. */
export const faqJsonService: FaqRepository = {
  async getFaqAnswer(input: GetFaqAnswerInput): Promise<GetFaqAnswerOutput> {
    const data = await loadData();
    const queryTokens = tokenize(input.question);

    const scored = data.faqs
      .map((faq) => ({
        faq,
        score: Math.max(
          scoreOverlap(queryTokens, faq.question) * 1.5,
          scoreOverlap(queryTokens, faq.answer) + scoreOverlap(queryTokens, faq.category) * 0.5
        ),
      }))
      .sort((a, b) => b.score - a.score);

    const [top, ...rest] = scored;
    const bestMatch = top && top.score > 0 ? top.faq : null;
    const alternates = rest
      .filter((entry) => entry.score > 0)
      .slice(0, 2)
      .map((entry) => entry.faq);

    return { bestMatch, matchScore: top?.score ?? 0, alternates };
  },
};
