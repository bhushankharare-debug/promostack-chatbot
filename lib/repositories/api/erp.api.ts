import { getInternalApiBaseUrl } from "@/lib/config/constants";
import type {
  ERPRepository,
  GetOrderStatusInput,
  GetOrderStatusOutput,
  GetTopSellingItemsInput,
  GetTopSellingItemsOutput,
} from "../interfaces/erp.repository";
import { RepositoryApiError } from "./apiError";

async function getJson<T>(path: string): Promise<T> {
  const url = `${getInternalApiBaseUrl()}${path}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new RepositoryApiError(body.error ?? `Request to ${path} failed`, response.status);
  }
  return (await response.json()) as T;
}

/**
 * HTTP-backed implementation of ERPRepository. This is the implementation
 * agents actually depend on — swapping it out for a real ERP API later
 * means changing only this file.
 */
export const erpApiRepository: ERPRepository = {
  async getOrderStatus(input: GetOrderStatusInput): Promise<GetOrderStatusOutput> {
    const params = new URLSearchParams();
    if (input.customerId) params.set("customerId", input.customerId);
    if (input.orderId) params.set("orderId", input.orderId);
    return getJson<GetOrderStatusOutput>(`/api/erp/order-status?${params.toString()}`);
  },

  async getTopSellingItems(input: GetTopSellingItemsInput): Promise<GetTopSellingItemsOutput> {
    const params = new URLSearchParams();
    if (input.limit) params.set("limit", String(input.limit));
    return getJson<GetTopSellingItemsOutput>(`/api/erp/top-selling-items?${params.toString()}`);
  },
};
