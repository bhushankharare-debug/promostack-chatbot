import { z } from "zod";

/**
 * Neither field defaults to a demo customer: the identity gate upstream in
 * the graph guarantees at least one of orderId/customerId is present before
 * this tool ever runs (asking the user rather than guessing when both are
 * missing). The refine below is defense in depth against that invariant
 * ever being bypassed (e.g. a future direct caller of this tool).
 */
export const GetOrderStatusInputSchema = z
  .object({
    customerId: z.string().nullish(),
    orderId: z.string().nullish(),
  })
  .refine((input) => Boolean(input.customerId) || Boolean(input.orderId), {
    message: "Either customerId or orderId is required",
  });
export type GetOrderStatusToolInput = z.infer<typeof GetOrderStatusInputSchema>;

const ErpOrderItemSchema = z.object({
  sku: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  currency: z.string(),
});

const ErpOrderSchema = z.object({
  orderId: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  orderDate: z.string(),
  status: z.string(),
  items: z.array(ErpOrderItemSchema),
  estimatedShipDate: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  carrier: z.string().optional(),
  totalAmount: z.number(),
  currency: z.string(),
  deliveredDate: z.string().optional(),
  holdReason: z.string().optional(),
});

export const GetOrderStatusOutputSchema = z.object({
  orders: z.array(ErpOrderSchema),
});
export type GetOrderStatusToolOutput = z.infer<typeof GetOrderStatusOutputSchema>;

export const GetTopSellingItemsInputSchema = z.object({
  limit: z.number().int().positive().max(20).nullish(),
});
export type GetTopSellingItemsToolInput = z.infer<typeof GetTopSellingItemsInputSchema>;

export const GetTopSellingItemsOutputSchema = z.object({
  items: z.array(
    z.object({
      rank: z.number(),
      sku: z.string(),
      productName: z.string(),
      category: z.string(),
      unitsSoldLast90Days: z.number(),
      revenue: z.number(),
      currency: z.string(),
    })
  ),
});
export type GetTopSellingItemsToolOutput = z.infer<typeof GetTopSellingItemsOutputSchema>;
