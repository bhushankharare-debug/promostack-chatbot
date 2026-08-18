import { readJsonFile } from "./readJson";
import type {
  InventoryRecord,
  ListInventoryInput,
  ListInventoryOutput,
  OneStoreRepository,
  PlaceOrderInput,
  PlaceOrderOutput,
  PlacedOrder,
  Product,
  SearchProductsInput,
  SearchProductsOutput,
} from "../interfaces/onestore.repository";

interface OneStoreServiceFile {
  products: Product[];
  inventory: InventoryRecord[];
  orders_placed: PlacedOrder[];
}

async function loadData(): Promise<OneStoreServiceFile> {
  return readJsonFile<OneStoreServiceFile>("onestore_service.json");
}

let mockOrderSequence = 0;

/** Naive singularizer so "speakers" matches "speaker" in product text. */
function normalizeToken(token: string): string {
  return token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token;
}

/** Token-based match (not a single literal substring) so word order/plurals in a free-text keyword still find the product. */
function matchesKeyword(product: Product, keyword: string): boolean {
  const haystack = `${product.productName} ${product.description} ${product.category} ${product.subCategory}`
    .toLowerCase();
  const tokens = keyword
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return true;
  return tokens.every((token) => haystack.includes(token) || haystack.includes(normalizeToken(token)));
}

/** JSON-backed implementation of OneStoreRepository. Used only by the /api/onestore/* route handlers. */
export const oneStoreJsonService: OneStoreRepository = {
  async searchProducts(input: SearchProductsInput): Promise<SearchProductsOutput> {
    const data = await loadData();
    let products = data.products;

    if (input.keyword) {
      products = products.filter((p) => matchesKeyword(p, input.keyword!));
    }
    if (input.category) {
      const category = input.category.toLowerCase();
      products = products.filter(
        (p) => p.category.toLowerCase() === category || p.subCategory.toLowerCase() === category
      );
    }
    if (typeof input.minPrice === "number") {
      const minPrice = input.minPrice;
      products = products.filter((p) => p.price >= minPrice);
    }
    if (typeof input.maxPrice === "number") {
      const maxPrice = input.maxPrice;
      products = products.filter((p) => p.price <= maxPrice);
    }

    return { products };
  },

  async listInventory(input: ListInventoryInput): Promise<ListInventoryOutput> {
    const data = await loadData();
    let inventory = data.inventory;

    if (input.sku) {
      const sku = input.sku.toLowerCase();
      inventory = inventory.filter((i) => i.sku.toLowerCase() === sku);
    }
    if (input.warehouse) {
      const warehouse = input.warehouse.toLowerCase();
      inventory = inventory.filter((i) => i.warehouse.toLowerCase() === warehouse);
    }

    inventory = [...inventory].sort((a, b) => b.availableUnits - a.availableUnits);
    return { inventory };
  },

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderOutput> {
    const data = await loadData();
    const product = data.products.find((p) => p.sku === input.sku);
    if (!product) {
      throw new Error(`Unknown SKU: ${input.sku}`);
    }

    mockOrderSequence += 1;
    const order: PlacedOrder = {
      orderId: `OS-ORD-POC-${Date.now()}-${mockOrderSequence}`,
      customerId: input.customerId,
      sku: product.sku,
      productName: product.productName,
      quantity: input.quantity,
      unitPrice: product.price,
      totalAmount: Number((product.price * input.quantity).toFixed(2)),
      currency: product.currency,
      orderDate: new Date().toISOString(),
      status: "Order Confirmed (POC mock — not persisted)",
      shippingAddress: input.shippingAddress ?? "Not provided",
      estimatedDelivery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    };

    return { order };
  },
};
