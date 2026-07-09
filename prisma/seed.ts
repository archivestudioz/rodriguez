import { PrismaClient } from "@prisma/client";
import { subDays } from "date-fns";

const prisma = new PrismaClient();

// A believable bodega catalog: name, PLU, category, cost, price
const CATALOG = [
  ["Cafe con Leche (M)", "1001", "Coffee & Hot", 0.45, 2.0],
  ["Cafe con Leche (L)", "1002", "Coffee & Hot", 0.6, 2.75],
  ["Bacon Egg & Cheese", "1010", "Deli", 1.35, 4.5],
  ["Chopped Cheese", "1011", "Deli", 2.1, 7.0],
  ["Turkey Hero", "1012", "Deli", 2.75, 8.5],
  ["Coca-Cola 20oz", "2001", "Beverages", 0.85, 2.25],
  ["Poland Spring 1L", "2002", "Beverages", 0.55, 1.75],
  ["Red Bull 12oz", "2003", "Beverages", 1.55, 3.5],
  ["Lay's Classic", "3001", "Snacks", 0.65, 1.75],
  ["Doritos Nacho", "3002", "Snacks", 0.7, 2.0],
  ["Snickers Bar", "3003", "Snacks", 0.55, 1.75],
  ["Marlboro Gold", "4001", "Tobacco", 9.2, 12.0],
  ["Loose Cigarette", "4002", "Tobacco", 0.4, 0.75],
  ["Bustelo 10oz", "5001", "Grocery", 3.1, 6.49],
  ["Wonder Bread", "5002", "Grocery", 1.3, 3.29],
  ["Large Eggs Dozen", "5003", "Grocery", 2.4, 4.99],
] as const;

// Popularity weights — how many units/day roughly
const POP: Record<string, number> = {
  "1001": 40, "1002": 28, "1010": 30, "1011": 18, "1012": 8,
  "2001": 35, "2002": 22, "2003": 14, "3001": 20, "3002": 16,
  "3003": 18, "4001": 12, "4002": 24, "5001": 4, "5002": 6, "5003": 5,
};

// deterministic-ish jitter
function jitter(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

async function main() {
  console.log("Clearing existing data…");
  await prisma.sale.deleteMany();
  await prisma.productAlias.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.product.deleteMany();

  console.log("Seeding catalog…");
  const products = [];
  for (const [name, sku, category, unitCost, salePrice] of CATALOG) {
    const p = await prisma.product.create({
      data: { name, sku, category, unitCost, salePrice },
    });
    products.push(p);
  }
  const bySku = new Map(products.map((p) => [p.sku!, p]));

  console.log("Generating ~120 days of sales…");
  const DAYS = 120;
  const sales: {
    productId: string;
    rawItem: string;
    rawSku: string | null;
    saleDate: Date;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    unitCost: number;
  }[] = [];

  let s = 1;
  for (let d = 0; d < DAYS; d++) {
    const day = subDays(new Date(), d);
    // weekends busier
    const dow = day.getDay();
    const weekendBoost = dow === 0 || dow === 6 ? 1.25 : 1;
    for (const [sku, base] of Object.entries(POP)) {
      const p = bySku.get(sku)!;
      const units = Math.max(0, Math.round(base * weekendBoost * (0.6 + jitter(s++) * 0.8)));
      if (units === 0) continue;
      // occasional promo pricing
      const price = p.salePrice * (jitter(s++) > 0.94 ? 0.9 : 1);
      sales.push({
        productId: p.id,
        rawItem: p.name,
        rawSku: p.sku,
        saleDate: day,
        quantity: units,
        unitPrice: Math.round(price * 100) / 100,
        lineTotal: Math.round(price * units * 100) / 100,
        unitCost: p.unitCost,
      });
    }
  }

  // A couple of unmatched labels, to demonstrate reconciliation
  for (let d = 0; d < 20; d++) {
    const day = subDays(new Date(), d);
    sales.push({
      productId: null as unknown as string,
      rawItem: "MISC GROCERY",
      rawSku: "9999",
      saleDate: day,
      quantity: Math.round(3 + jitter(s++) * 6),
      unitPrice: 1.99,
      lineTotal: Math.round((1.99 * (3 + jitter(s) * 6)) * 100) / 100,
      unitCost: null as unknown as number,
    });
  }

  const batch = await prisma.importBatch.create({
    data: {
      filename: "seed-history.csv",
      source: "sd-card",
      mapping: JSON.stringify({ saleDate: "Date", item: "Item", sku: "PLU" }),
      rowCount: sales.length,
      matchedCount: sales.filter((x) => x.productId).length,
    },
  });

  // chunked insert
  for (let i = 0; i < sales.length; i += 500) {
    await prisma.sale.createMany({
      data: sales.slice(i, i + 500).map((x) => ({ ...x, batchId: batch.id })),
    });
  }

  console.log(`Done. ${products.length} products, ${sales.length} sales.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
