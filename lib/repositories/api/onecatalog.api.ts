import { getInternalApiBaseUrl } from "@/lib/config/constants";
import type {
  CheckCreditBalanceInput,
  CheckCreditBalanceOutput,
  CreateCatalogResult,
  FetchBestPerformingFlyerInput,
  FetchBestPerformingFlyerOutput,
  OneCatalogRepository,
} from "../interfaces/onecatalog.repository";
import { RepositoryApiError } from "./apiError";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getInternalApiBaseUrl()}${path}`, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new RepositoryApiError(body.error ?? `Request to ${path} failed`, response.status);
  }
  return (await response.json()) as T;
}

async function postJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getInternalApiBaseUrl()}${path}`, { method: "POST" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new RepositoryApiError(body.error ?? `Request to ${path} failed`, response.status);
  }
  return (await response.json()) as T;
}

export const oneCatalogApiRepository: OneCatalogRepository = {
  async checkCreditBalance(input: CheckCreditBalanceInput): Promise<CheckCreditBalanceOutput> {
    const params = new URLSearchParams();
    if (input.customerId) params.set("customerId", input.customerId);
    return getJson<CheckCreditBalanceOutput>(`/api/onecatalog/credit-balance?${params.toString()}`);
  },

  async fetchBestPerformingFlyer(
    input: FetchBestPerformingFlyerInput
  ): Promise<FetchBestPerformingFlyerOutput> {
    const params = new URLSearchParams();
    if (input.customerId) params.set("customerId", input.customerId);
    return getJson<FetchBestPerformingFlyerOutput>(
      `/api/onecatalog/best-performing-flyer?${params.toString()}`
    );
  },

  async createCatalog(): Promise<CreateCatalogResult> {
    return postJson<CreateCatalogResult>("/api/onecatalog/create-catalog");
  },
};
