import { z } from "zod";

export const GetFaqAnswerInputSchema = z.object({
  question: z.string().min(1, "question is required"),
});
export type GetFaqAnswerToolInput = z.infer<typeof GetFaqAnswerInputSchema>;

const FaqRecordSchema = z.object({
  faqId: z.string(),
  category: z.string(),
  question: z.string(),
  answer: z.string(),
});

export const GetFaqAnswerOutputSchema = z.object({
  bestMatch: FaqRecordSchema.nullable(),
  matchScore: z.number(),
  alternates: z.array(FaqRecordSchema),
});
export type GetFaqAnswerToolOutput = z.infer<typeof GetFaqAnswerOutputSchema>;
