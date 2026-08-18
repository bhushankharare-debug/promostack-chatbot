/** Data shapes mirror onestore_service.json. */

export interface Product {
  sku: string;
  productName: string;
  category: string;
  subCategory: string;
  price: number;
  currency: string;
  moq: number;
  imprintMethods: string[];
  description: string;
  inStock: boolean;
}

export interface InventoryRecord {
  sku: string;
  warehouse: string;
  availableUnits: number;
  reservedUnits: number;
  reorderThreshold: number;
}

export interface PlacedOrder {
  orderId: string;
  customerId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  orderDate: string;
  status: string;
  shippingAddress: string;
  estimatedDelivery: string;
}

export interface SearchProductsInput {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}
export interface SearchProductsOutput {
  products: Product[];
}

/**
 * The single flexible inventory query the repository exposes: filter by sku
 * and/or warehouse, or omit both to list everything. Always sorted by
 * availableUnits descending, so "which warehouse/SKU has the most stock"
 * questions are answerable from the first result. The agent tool layer
 * builds two ergonomic entry points on top of this — a single-SKU lookup
 * (getInventory, for the searchProducts -> getInventory -> placeOrder
 * chain) and a browse/filter one (listInventory, for "what's in warehouse
 * X" / "which warehouse has the most units" style questions) — rather than
 * the repository itself having two overlapping methods.
 */
export interface ListInventoryInput {
  sku?: string;
  warehouse?: string;
}
export interface ListInventoryOutput {
  inventory: InventoryRecord[];
}

export interface PlaceOrderInput {
  customerId: string;
  sku: string;
  quantity: number;
  shippingAddress?: string;
}
export interface PlaceOrderOutput {
  order: PlacedOrder;
}

export interface OneStoreRepository {
  searchProducts(input: SearchProductsInput): Promise<SearchProductsOutput>;
  listInventory(input: ListInventoryInput): Promise<ListInventoryOutput>;
  /**
   * POC write: the underlying JSON is static, so this does not persist to
   * disk or a database. It returns a confirmation record shaped exactly
   * like the seed record in orders_placed, per the spec's "no DB" and
   * "no invented persistent behavior" constraints.
   */
  placeOrder(input: PlaceOrderInput): Promise<PlaceOrderOutput>;
}
