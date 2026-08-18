import { getInternalApiBaseUrl } from "@/lib/config/constants";
import type { FaqRepository, GetFaqAnswerInput, GetFaqAnswerOutput } from "../interfaces/faq.repository";
import { RepositoryApiError } from "./apiError";

export const faqApiRepository: FaqRepository = {
  async getFaqAnswer(input: GetFaqAnswerInput): Promise<GetFaqAnswerOutput> {
    const params = new URLSearchParams({ question: input.question });
    const response = await fetch(`${getInternalApiBaseUrl()}/api/faq?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new RepositoryApiError(body.error ?? "Request to /api/faq failed", response.status);
    }
    return (await response.json()) as GetFaqAnswerOutput;
  },
};
