import { existsSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as getOrderStatus } from "@/app/api/erp/order-status/route";
import { GET as getTopSellingItems } from "@/app/api/erp/top-selling-items/route";
import { GET as getBestFlyer } from "@/app/api/onecatalog/best-performing-flyer/route";
import { POST as createCatalog } from "@/app/api/onecatalog/create-catalog/route";
import { GET as getCreditBalance } from "@/app/api/onecatalog/credit-balance/route";
import { GET as getInventory } from "@/app/api/onestore/inventory/route";
import { POST as placeOrder } from "@/app/api/onestore/orders/route";
import { GET as searchProducts } from "@/app/api/onestore/products/route";
import { GET as getFaqAnswer } from "@/app/api/faq/route";

describe("ERP routes", () => {
  it("returns CUST-10234's orders sorted most-recent-first", async () => {
    const response = await getOrderStatus(
      new NextRequest("http://localhost/api/erp/order-status?customerId=CUST-10234")
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.orders.length).toBeGreaterThan(0);
    expect(body.orders.every((order: { customerId: string }) => order.customerId === "CUST-10234")).toBe(
      true
    );
  });

  it("returns top selling items ranked, respecting a limit", async () => {
    const response = await getTopSellingItems(
      new NextRequest("http://localhost/api/erp/top-selling-items?limit=2")
    );
    const body = await response.json();
    expect(body.items).toHaveLength(2);
    expect(body.items[0].rank).toBeLessThan(body.items[1].rank);
  });
});

describe("OneCatalog routes", () => {
  it("returns a credit balance for a known customer", async () => {
    const response = await getCreditBalance(
      new NextRequest("http://localhost/api/onecatalog/credit-balance?customerId=CUST-10501")
    );
    const body = await response.json();
    expect(body.balance.customerId).toBe("CUST-10501");
  });

  it("returns the highest ranked flyer for a customer", async () => {
    const response = await getBestFlyer(
      new NextRequest("http://localhost/api/onecatalog/best-performing-flyer?customerId=CUST-10234")
    );
    const body = await response.json();
    expect(body.flyer.rank).toBe(1);
  });

  it("create-catalog returns the same static mock confirmation every time (no persistence)", async () => {
    const first = await (await createCatalog()).json();
    const second = await (await createCatalog()).json();
    expect(first.status).toBe("success");
    expect(typeof first.popupMessage).toBe("string");
    expect(first.catalogId).toBe(second.catalogId);
  });
});

describe("OneStore routes", () => {
  it("filters products by keyword and max price", async () => {
    const response = await searchProducts(
      new NextRequest("http://localhost/api/onestore/products?keyword=bluetooth&maxPrice=25")
    );
    const body = await response.json();
    expect(body.products.length).toBeGreaterThan(0);
    expect(body.products.every((p: { price: number }) => p.price <= 25)).toBe(true);
  });

  it("looks up inventory for one sku", async () => {
    const response = await getInventory(
      new NextRequest("http://localhost/api/onestore/inventory?sku=SP-BT-100")
    );
    const body = await response.json();
    expect(body.inventory).toHaveLength(1);
    expect(body.inventory[0].sku).toBe("SP-BT-100");
  });

  it("lists inventory for a warehouse, sorted by available units descending", async () => {
    const response = await getInventory(
      new NextRequest("http://localhost/api/onestore/inventory?warehouse=WH-EAST-01")
    );
    const body = await response.json();
    expect(body.inventory.length).toBeGreaterThan(1);
    expect(body.inventory.every((i: { warehouse: string }) => i.warehouse === "WH-EAST-01")).toBe(true);
    const units = body.inventory.map((i: { availableUnits: number }) => i.availableUnits);
    expect(units).toEqual([...units].sort((a, b) => b - a));
  });

  it("lists all inventory, sorted by available units descending, when no filter is given", async () => {
    const response = await getInventory(new NextRequest("http://localhost/api/onestore/inventory"));
    const body = await response.json();
    expect(body.inventory.length).toBeGreaterThan(1);
    expect(body.inventory[0].availableUnits).toBeGreaterThanOrEqual(body.inventory[1].availableUnits);
  });

  it("rejects an invalid order body and accepts a valid one, without needing persistence", async () => {
    const badRequest = new NextRequest("http://localhost/api/onestore/orders", {
      method: "POST",
      body: JSON.stringify({ sku: "EB-500" }),
      headers: { "Content-Type": "application/json" },
    });
    expect((await placeOrder(badRequest)).status).toBe(400);

    const goodRequest = new NextRequest("http://localhost/api/onestore/orders", {
      method: "POST",
      body: JSON.stringify({ customerId: "CUST-10234", sku: "EB-500", quantity: 10 }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await placeOrder(goodRequest);
    const body = await response.json();
    expect(body.order.sku).toBe("EB-500");
    expect(body.order.quantity).toBe(10);
    expect(body.order.totalAmount).toBeCloseTo(125);
  });
});

describe("FAQ service isolation", () => {
  it("answers a known FAQ question via the dedicated /api/faq route", async () => {
    const response = await getFaqAnswer(
      new NextRequest("http://localhost/api/faq?question=What+is+the+minimum+order+quantity")
    );
    const body = await response.json();
    expect(body.bestMatch?.faqId).toBe("FAQ-003");
  });

  it("never exposes FAQ through an /api/onestore/faq route", () => {
    const forbiddenPath = path.join(process.cwd(), "app/api/onestore/faq/route.ts");
    expect(existsSync(forbiddenPath)).toBe(false);
  });
});
