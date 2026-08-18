/** Data shapes mirror faq_service.json. Independent from OneStore. */

export interface FaqRecord {
  faqId: string;
  category: string;
  question: string;
  answer: string;
}

export interface GetFaqAnswerInput {
  question: string;
}
export interface GetFaqAnswerOutput {
  bestMatch: FaqRecord | null;
  matchScore: number;
  alternates: FaqRecord[];
}

export interface FaqRepository {
  getFaqAnswer(input: GetFaqAnswerInput): Promise<GetFaqAnswerOutput>;
}
