/** Data shapes mirror onecatalog_service.json. */

export interface CreditBalance {
  customerId: string;
  customerName: string;
  company: string;
  creditLimit: number;
  creditUsed: number;
  creditAvailable: number;
  currency: string;
  lastUpdated: string;
  status: string;
}

export interface Flyer {
  flyerId: string;
  flyerName: string;
  customerId: string;
  createdAt: string;
  views: number;
  clicks: number;
  conversions: number;
  conversionRate: string;
  revenueGenerated: number;
  currency: string;
  rank: number;
  flyerUrl: string;
}

export interface CreateCatalogResult {
  status: string;
  popupMessage: string;
  catalogId: string;
  createdAt: string;
}

export interface CheckCreditBalanceInput {
  customerId?: string;
}
export interface CheckCreditBalanceOutput {
  balance: CreditBalance | null;
}

export interface FetchBestPerformingFlyerInput {
  customerId?: string;
}
export interface FetchBestPerformingFlyerOutput {
  flyer: Flyer | null;
}

export interface OneCatalogRepository {
  checkCreditBalance(input: CheckCreditBalanceInput): Promise<CheckCreditBalanceOutput>;
  fetchBestPerformingFlyer(input: FetchBestPerformingFlyerInput): Promise<FetchBestPerformingFlyerOutput>;
  /** POC action only — returns the static mock_response from onecatalog_service.json, no persistence. */
  createCatalog(): Promise<CreateCatalogResult>;
}
