import { PrismaClient } from "@prisma/client";
import { subDays } from "date-fns";

const prisma = new PrismaClient();

// Placeholder bodega catalog: [name, PLU, category, unitCost, salePrice, baseUnitsPerDay]
const CATALOG: [string, string, string, number, number, number][] = [
  // Sandwiches / Deli
  ["Bacon Egg & Cheese", "1010", "Sandwiches", 1.35, 4.5, 5],
  ["Chopped Cheese", "1011", "Sandwiches", 2.1, 7.0, 3],
  ["Turkey Club Hero", "1012", "Sandwiches", 2.75, 8.5, 2],
  ["Ham & Cheese", "1013", "Sandwiches", 1.8, 6.0, 2],
  ["Grilled Cheese", "1014", "Sandwiches", 0.9, 3.5, 2],
  // Coffee & Hot
  ["Coffee (Medium)", "1001", "Coffee & Hot", 0.45, 2.0, 14],
  ["Coffee (Large)", "1002", "Coffee & Hot", 0.6, 2.75, 9],
  // Beverages
  ["Coca-Cola 20oz", "2001", "Beverages", 0.85, 2.25, 9],
  ["Poland Spring 1L", "2002", "Beverages", 0.55, 1.75, 6],
  ["Red Bull 12oz", "2003", "Beverages", 1.55, 3.5, 3],
  ["Arizona Iced Tea", "2004", "Beverages", 0.6, 1.5, 5],
  ["Tropicana OJ", "2005", "Beverages", 1.2, 2.99, 2],
  ["Gatorade 20oz", "2006", "Beverages", 0.9, 2.5, 3],
  // Chips & Snacks
  ["Lay's Classic", "3001", "Chips & Snacks", 0.65, 1.75, 5],
  ["Doritos Nacho", "3002", "Chips & Snacks", 0.7, 2.0, 4],
  ["Cheez-Its", "3003", "Chips & Snacks", 0.75, 2.25, 2],
  ["Pretzels", "3004", "Chips & Snacks", 0.55, 1.5, 2],
  // Candy
  ["Snickers Bar", "4001", "Candy", 0.55, 1.75, 4],
  ["M&M's Peanut", "4002", "Candy", 0.6, 1.85, 3],
  ["Trident Gum", "4003", "Candy", 0.45, 1.5, 2],
  // Grocery
  ["Wonder Bread", "5002", "Grocery", 1.3, 3.29, 1],
  ["Large Eggs Dozen", "5003", "Grocery", 2.4, 4.99, 1],
  ["Bustelo Coffee 10oz", "5001", "Grocery", 3.1, 6.49, 1],
  ["Milk ½ Gallon", "5004", "Grocery", 1.9, 3.99, 2],
  // Tobacco
  ["Marlboro Gold", "6001", "Tobacco", 9.2, 12.0, 2],
  ["Newport 100s", "6002", "Tobacco", 9.4, 12.5, 1],
];

const DAYS = 365;
const TARGET_REVENUE = 60000;

// Deterministic pseudo-random so reseeds look similar.
function jitter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x); // 0..1
}

async function main() {
  console.log("Clearing existing data…");
  await prisma.sale.deleteMany();
  await prisma.productAlias.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.product.deleteMany();

  console.log(`Seeding ${CATALOG.length} products…`);
  const products = [];
  for (const [name, sku, category, unitCost, salePrice] of CATALOG) {
    products.push(
      await prisma.product.create({
        data: { name, sku, category, unitCost, salePrice },
      }),
    );
  }
  const bySku = new Map(products.map((p) => [p.sku!, p]));

  // Scale so a year of sales lands near $60k. Weekend avg factor ≈ 1.07,
  // jitter mean ≈ 1.0.
  const naturalDaily = CATALOG.reduce((s, [, , , , price, base]) => s + base * price, 0);
  const scale = TARGET_REVENUE / (naturalDaily * DAYS * 1.07);

  console.log(`Generating ${DAYS} days of sales (target ~$${TARGET_REVENUE.toLocaleString()})…`);
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
  let total = 0;
  for (let d = 0; d < DAYS; d++) {
    const day = subDays(new Date(), d);
    const dow = day.getDay();
    const weekendBoost = dow === 0 || dow === 6 ? 1.25 : 1;
    for (const [name, sku, , unitCost, price, base] of CATALOG) {
      const p = bySku.get(sku)!;
      const j = 0.55 + jitter(s++) * 0.9; // 0.55..1.45, mean ≈ 1.0
      const units = Math.round(base * weekendBoost * j * scale);
      if (units <= 0) continue;
      const promo = jitter(s++) > 0.94 ? 0.9 : 1; // occasional 10% off
      const unitPrice = Math.round(price * promo * 100) / 100;
      const lineTotal = Math.round(unitPrice * units * 100) / 100;
      total += lineTotal;
      sales.push({
        productId: p.id,
        rawItem: name,
        rawSku: sku,
        saleDate: day,
        quantity: units,
        unitPrice,
        lineTotal,
        unitCost,
      });
    }
  }

  const batch = await prisma.importBatch.create({
    data: {
      filename: "placeholder-year.csv",
      source: "sd-card",
      mapping: JSON.stringify({ saleDate: "Date", item: "Description", sku: "PLU" }),
      rowCount: sales.length,
      matchedCount: sales.length,
    },
  });

  for (let i = 0; i < sales.length; i += 500) {
    await prisma.sale.createMany({
      data: sales.slice(i, i + 500).map((x) => ({ ...x, batchId: batch.id })),
    });
  }

  console.log(
    `Done. ${products.length} products, ${sales.length} sales, ~$${Math.round(total).toLocaleString()} revenue over ${DAYS} days.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
