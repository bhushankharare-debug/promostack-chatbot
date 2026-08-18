import { z } from "zod";

/** No default customer: the identity gate upstream requires a customerId before this tool ever runs. */
export const CheckCreditBalanceInputSchema = z.object({
  customerId: z.string().min(1, "customerId is required"),
});
export type CheckCreditBalanceToolInput = z.infer<typeof CheckCreditBalanceInputSchema>;

export const CheckCreditBalanceOutputSchema = z.object({
  balance: z
    .object({
      customerId: z.string(),
      customerName: z.string(),
      company: z.string(),
      creditLimit: z.number(),
      creditUsed: z.number(),
      creditAvailable: z.number(),
      currency: z.string(),
      lastUpdated: z.string(),
      status: z.string(),
    })
    .nullable(),
});
export type CheckCreditBalanceToolOutput = z.infer<typeof CheckCreditBalanceOutputSchema>;

/** No default customer: the identity gate upstream requires a customerId before this tool ever runs. */
export const FetchBestPerformingFlyerInputSchema = z.object({
  customerId: z.string().min(1, "customerId is required"),
});
export type FetchBestPerformingFlyerToolInput = z.infer<typeof FetchBestPerformingFlyerInputSchema>;

export const FetchBestPerformingFlyerOutputSchema = z.object({
  flyer: z
    .object({
      flyerId: z.string(),
      flyerName: z.string(),
      customerId: z.string(),
      createdAt: z.string(),
      views: z.number(),
      clicks: z.number(),
      conversions: z.number(),
      conversionRate: z.string(),
      revenueGenerated: z.number(),
      currency: z.string(),
      rank: z.number(),
      flyerUrl: z.string(),
    })
    .nullable(),
});
export type FetchBestPerformingFlyerToolOutput = z.infer<typeof FetchBestPerformingFlyerOutputSchema>;

export const CreateCatalogInputSchema = z.object({});
export type CreateCatalogToolInput = z.infer<typeof CreateCatalogInputSchema>;

export const CreateCatalogOutputSchema = z.object({
  status: z.literal("PENDING_UI_CONFIRMATION"),
  message: z.string(),
});
export type CreateCatalogToolOutput = z.infer<typeof CreateCatalogOutputSchema>;
