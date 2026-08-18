/**
 * Data shapes mirror erp_service.json exactly. That file only supports two
 * capabilities — order status and top-selling items — there is no
 * customer-master or pricing-catalog data source in it, so this repository
 * (and the ERP agent built on top of it) intentionally does not expose
 * getCustomer()/getPricing(): inventing them would mean inventing business
 * data, which the build spec explicitly forbids.
 */

export interface ErpOrderItem {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}

export interface ErpOrder {
  orderId: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  status: string;
  items: ErpOrderItem[];
  estimatedShipDate: string | null;
  trackingNumber: string | null;
  carrier?: string;
  totalAmount: number;
  currency: string;
  deliveredDate?: string;
  holdReason?: string;
}

export interface TopSellingItem {
  rank: number;
  sku: string;
  productName: string;
  category: string;
  unitsSoldLast90Days: number;
  revenue: number;
  currency: string;
}

export interface GetOrderStatusInput {
  customerId?: string;
  orderId?: string;
}
export interface GetOrderStatusOutput {
  orders: ErpOrder[];
}

export interface GetTopSellingItemsInput {
  limit?: number;
}
export interface GetTopSellingItemsOutput {
  items: TopSellingItem[];
}

export interface ERPRepository {
  getOrderStatus(input: GetOrderStatusInput): Promise<GetOrderStatusOutput>;
  getTopSellingItems(input: GetTopSellingItemsInput): Promise<GetTopSellingItemsOutput>;
}
