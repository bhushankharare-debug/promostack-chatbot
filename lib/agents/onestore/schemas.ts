import { z } from "zod";
import { DEFAULT_CUSTOMER_ID } from "@/lib/config/constants";

export const SearchProductsInputSchema = z.object({
  keyword: z.string().nullish(),
  category: z.string().nullish(),
  minPrice: z.number().nullish(),
  maxPrice: z.number().nullish(),
});
export type SearchProductsToolInput = z.infer<typeof SearchProductsInputSchema>;

const ProductSchema = z.object({
  sku: z.string(),
  productName: z.string(),
  category: z.string(),
  subCategory: z.string(),
  price: z.number(),
  currency: z.string(),
  moq: z.number(),
  imprintMethods: z.array(z.string()),
  description: z.string(),
  inStock: z.boolean(),
});

export const SearchProductsOutputSchema = z.object({
  products: z.array(ProductSchema),
});
export type SearchProductsToolOutput = z.infer<typeof SearchProductsOutputSchema>;

const InventoryRecordSchema = z.object({
  sku: z.string(),
  warehouse: z.string(),
  availableUnits: z.number(),
  reservedUnits: z.number(),
  reorderThreshold: z.number(),
});

export const GetInventoryInputSchema = z.object({
  sku: z.string().min(1, "sku is required"),
});
export type GetInventoryToolInput = z.infer<typeof GetInventoryInputSchema>;

export const GetInventoryOutputSchema = z.object({
  inventory: InventoryRecordSchema.nullable(),
});
export type GetInventoryToolOutput = z.infer<typeof GetInventoryOutputSchema>;

/** No sku required: omit it (with or without a warehouse) to browse/list rather than look up one specific item. */
export const ListInventoryInputSchema = z.object({
  warehouse: z.string().nullish(),
});
export type ListInventoryToolInput = z.infer<typeof ListInventoryInputSchema>;

export const ListInventoryOutputSchema = z.object({
  inventory: z.array(InventoryRecordSchema),
});
export type ListInventoryToolOutput = z.infer<typeof ListInventoryOutputSchema>;

export const PlaceOrderInputSchema = z.object({
  customerId: z.string().default(DEFAULT_CUSTOMER_ID),
  sku: z.string().min(1, "sku is required"),
  quantity: z.number().int().positive("quantity must be a positive integer"),
  shippingAddress: z.string().nullish(),
});
export type PlaceOrderToolInput = z.infer<typeof PlaceOrderInputSchema>;

export const PlaceOrderOutputSchema = z.object({
  order: z.object({
    orderId: z.string(),
    customerId: z.string(),
    sku: z.string(),
    productName: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalAmount: z.number(),
    currency: z.string(),
    orderDate: z.string(),
    status: z.string(),
    shippingAddress: z.string(),
    estimatedDelivery: z.string(),
  }),
});
export type PlaceOrderToolOutput = z.infer<typeof PlaceOrderOutputSchema>;
