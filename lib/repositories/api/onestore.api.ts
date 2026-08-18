import { getInternalApiBaseUrl } from "@/lib/config/constants";
import type {
  ListInventoryInput,
  ListInventoryOutput,
  OneStoreRepository,
  PlaceOrderInput,
  PlaceOrderOutput,
  SearchProductsInput,
  SearchProductsOutput,
} from "../interfaces/onestore.repository";
import { RepositoryApiError } from "./apiError";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getInternalApiBaseUrl()}${path}`, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new RepositoryApiError(body.error ?? `Request to ${path} failed`, response.status);
  }
  return (await response.json()) as T;
}

export const oneStoreApiRepository: OneStoreRepository = {
  async searchProducts(input: SearchProductsInput): Promise<SearchProductsOutput> {
    const params = new URLSearchParams();
    if (input.keyword) params.set("keyword", input.keyword);
    if (input.category) params.set("category", input.category);
    if (typeof input.minPrice === "number") params.set("minPrice", String(input.minPrice));
    if (typeof input.maxPrice === "number") params.set("maxPrice", String(input.maxPrice));
    return getJson<SearchProductsOutput>(`/api/onestore/products?${params.toString()}`);
  },

  async listInventory(input: ListInventoryInput): Promise<ListInventoryOutput> {
    const params = new URLSearchParams();
    if (input.sku) params.set("sku", input.sku);
    if (input.warehouse) params.set("warehouse", input.warehouse);
    return getJson<ListInventoryOutput>(`/api/onestore/inventory?${params.toString()}`);
  },

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderOutput> {
    const response = await fetch(`${getInternalApiBaseUrl()}/api/onestore/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new RepositoryApiError(body.error ?? "Request to /api/onestore/orders failed", response.status);
    }
    return (await response.json()) as PlaceOrderOutput;
  },
};
