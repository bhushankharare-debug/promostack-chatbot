import { readJsonFile } from "./readJson";
import type {
  ERPRepository,
  ErpOrder,
  GetOrderStatusInput,
  GetOrderStatusOutput,
  GetTopSellingItemsInput,
  GetTopSellingItemsOutput,
  TopSellingItem,
} from "../interfaces/erp.repository";

interface ErpServiceFile {
  orders: ErpOrder[];
  top_selling_items: TopSellingItem[];
}

async function loadErpData(): Promise<ErpServiceFile> {
  return readJsonFile<ErpServiceFile>("erp_service.json");
}

/** JSON-backed implementation of ERPRepository. Used only by the /api/erp/* route handlers. */
export const erpJsonService: ERPRepository = {
  async getOrderStatus(input: GetOrderStatusInput): Promise<GetOrderStatusOutput> {
    const data = await loadErpData();
    let orders = data.orders;

    if (input.orderId) {
      const target = input.orderId.toLowerCase();
      orders = orders.filter((order) => order.orderId.toLowerCase() === target);
    } else if (input.customerId) {
      orders = orders.filter((order) => order.customerId === input.customerId);
    }

    orders = [...orders].sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );

    return { orders };
  },

  async getTopSellingItems(input: GetTopSellingItemsInput): Promise<GetTopSellingItemsOutput> {
    const data = await loadErpData();
    const sorted = [...data.top_selling_items].sort((a, b) => a.rank - b.rank);
    const items = input.limit ? sorted.slice(0, input.limit) : sorted;
    return { items };
  },
};
