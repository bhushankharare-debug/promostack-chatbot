import { readJsonFile } from "./readJson";
import type {
  CheckCreditBalanceInput,
  CheckCreditBalanceOutput,
  CreateCatalogResult,
  CreditBalance,
  FetchBestPerformingFlyerInput,
  FetchBestPerformingFlyerOutput,
  Flyer,
  OneCatalogRepository,
} from "../interfaces/onecatalog.repository";

interface OneCatalogServiceFile {
  credit_balances: CreditBalance[];
  flyers: Flyer[];
  tools: Array<{ action_id: string; mock_response?: CreateCatalogResult }>;
}

async function loadData(): Promise<OneCatalogServiceFile> {
  return readJsonFile<OneCatalogServiceFile>("onecatalog_service.json");
}

/** JSON-backed implementation of OneCatalogRepository. Used only by the /api/onecatalog/* route handlers. */
export const oneCatalogJsonService: OneCatalogRepository = {
  async checkCreditBalance(input: CheckCreditBalanceInput): Promise<CheckCreditBalanceOutput> {
    const data = await loadData();
    const balance = data.credit_balances.find((b) => b.customerId === input.customerId) ?? null;
    return { balance };
  },

  async fetchBestPerformingFlyer(
    input: FetchBestPerformingFlyerInput
  ): Promise<FetchBestPerformingFlyerOutput> {
    const data = await loadData();
    const candidates = input.customerId
      ? data.flyers.filter((f) => f.customerId === input.customerId)
      : data.flyers;
    const best = [...candidates].sort((a, b) => a.rank - b.rank)[0] ?? null;
    return { flyer: best };
  },

  async createCatalog(): Promise<CreateCatalogResult> {
    const data = await loadData();
    const tool = data.tools.find((t) => t.action_id === "create_catalog");
    if (!tool?.mock_response) {
      throw new Error("create_catalog mock_response missing from onecatalog_service.json");
    }
    return tool.mock_response;
  },
};
