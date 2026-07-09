import { prisma } from "./db";
import {
  Period,
  currentRange,
  previousRange,
  recentBuckets,
  bucketKey,
  bucketLabel,
  trendCount,
} from "./dates";
import {
  Totals,
  emptyTotals,
  accumulate,
  totalsMargin,
  SaleLike,
} from "./margins";

type SaleRow = {
  saleDate: Date;
  quantity: number;
  lineTotal: number;
  unitCost: number | null;
  productId: string | null;
  rawItem: string;
  product: { name: string; category: string } | null;
};

const saleSelect = {
  saleDate: true,
  quantity: true,
  lineTotal: true,
  unitCost: true,
  productId: true,
  rawItem: true,
  product: { select: { name: true, category: true } },
} as const;

export type TrendPoint = {
  label: string;
  revenue: number;
  profit: number;
  cost: number;
};

export type TopItem = {
  key: string;
  name: string;
  category: string;
  units: number;
  revenue: number;
  profit: number | null;
  margin: number | null;
  costed: boolean;
};

export type Dashboard = {
  hasData: boolean;
  period: Period;
  current: Totals;
  previous: Totals;
  margin: number | null;
  prevMargin: number | null;
  trend: TrendPoint[];
  topByProfit: TopItem[];
  topByRevenue: TopItem[];
  gapsInRange: number;
  totalGaps: number;
};

function toSaleLike(r: SaleRow): SaleLike {
  return { quantity: r.quantity, lineTotal: r.lineTotal, unitCost: r.unitCost };
}

export async function getDashboard(period: Period): Promise<Dashboard> {
  const now = new Date();
  const cur = currentRange(period, now);
  const prev = previousRange(period, now);
  const buckets = recentBuckets(period, trendCount(period), now);
  const trendStart = buckets[0];

  const [count, curRows, prevRows, trendRows, totalGaps] = await Promise.all([
    prisma.sale.count(),
    prisma.sale.findMany({
      where: { saleDate: { gte: cur.start, lte: cur.end } },
      select: saleSelect,
    }),
    prisma.sale.findMany({
      where: { saleDate: { gte: prev.start, lte: prev.end } },
      select: saleSelect,
    }),
    prisma.sale.findMany({
      where: { saleDate: { gte: trendStart, lte: cur.end } },
      select: { saleDate: true, quantity: true, lineTotal: true, unitCost: true },
    }),
    prisma.sale.count({ where: { productId: null } }),
  ]);

  const current = (curRows as SaleRow[]).reduce(
    (t, r) => accumulate(t, toSaleLike(r)),
    emptyTotals(),
  );
  const previous = (prevRows as SaleRow[]).reduce(
    (t, r) => accumulate(t, toSaleLike(r)),
    emptyTotals(),
  );

  // Trend buckets
  const bucketTotals = new Map<string, Totals>();
  for (const b of buckets) bucketTotals.set(b.toISOString(), emptyTotals());
  for (const r of trendRows) {
    const key = bucketKey(r.saleDate, period);
    const t = bucketTotals.get(key);
    if (t) accumulate(t, { quantity: r.quantity, lineTotal: r.lineTotal, unitCost: r.unitCost });
  }
  const trend: TrendPoint[] = buckets.map((b) => {
    const t = bucketTotals.get(b.toISOString())!;
    return {
      label: bucketLabel(b, period),
      revenue: t.revenue,
      profit: t.profit,
      cost: t.cost,
    };
  });

  // Top items within current range
  const groups = new Map<string, TopItem & { _sale: Totals }>();
  for (const r of curRows as SaleRow[]) {
    const key = r.productId ?? `raw:${r.rawItem.toLowerCase()}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        name: r.product?.name ?? r.rawItem ?? "Unknown item",
        category: r.product?.category ?? "Unmatched",
        units: 0,
        revenue: 0,
        profit: null,
        margin: null,
        costed: r.productId != null,
        _sale: emptyTotals(),
      };
      groups.set(key, g);
    }
    accumulate(g._sale, toSaleLike(r));
  }
  const items: TopItem[] = [...groups.values()].map((g) => {
    const costed = g._sale.uncostedLines === 0 && g._sale.costedRevenue > 0;
    return {
      key: g.key,
      name: g.name,
      category: g.category,
      units: g._sale.units,
      revenue: g._sale.revenue,
      profit: costed ? g._sale.profit : null,
      margin: costed ? totalsMargin(g._sale) : null,
      costed,
    };
  });

  const topByProfit = [...items]
    .filter((i) => i.profit != null)
    .sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))
    .slice(0, 8);
  const topByRevenue = [...items]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return {
    hasData: count > 0,
    period,
    current,
    previous,
    margin: totalsMargin(current),
    prevMargin: totalsMargin(previous),
    trend,
    topByProfit,
    topByRevenue,
    gapsInRange: current.uncostedLines,
    totalGaps,
  };
}

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unitCost: number;
  salePrice: number;
  unit: string;
  active: boolean;
  unitsSold: number;
  revenue: number;
};

export async function getProducts(): Promise<ProductRow[]> {
  const products = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      sales: { select: { quantity: true, lineTotal: true } },
    },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    unitCost: p.unitCost,
    salePrice: p.salePrice,
    unit: p.unit,
    active: p.active,
    unitsSold: p.sales.reduce((s, x) => s + x.quantity, 0),
    revenue: p.sales.reduce((s, x) => s + x.lineTotal, 0),
  }));
}

export type LedgerSale = {
  id: string;
  saleDate: Date;
  item: string;
  sku: string | null;
  quantity: number;
  lineTotal: number;
  profit: number | null;
  matched: boolean;
  batchFile: string | null;
};

export type UnmatchedGroup = {
  raw: string;
  count: number;
  units: number;
  revenue: number;
};

export async function getLedger(unmatchedOnly: boolean): Promise<{
  sales: LedgerSale[];
  totalCount: number;
  unmatched: UnmatchedGroup[];
  productOptions: { id: string; name: string }[];
}> {
  const [rows, totalCount, unmatchedRows, products] = await Promise.all([
    prisma.sale.findMany({
      where: unmatchedOnly ? { productId: null } : undefined,
      orderBy: { saleDate: "desc" },
      take: 250,
      select: {
        id: true,
        saleDate: true,
        rawItem: true,
        rawSku: true,
        quantity: true,
        lineTotal: true,
        unitCost: true,
        productId: true,
        product: { select: { name: true } },
        batch: { select: { filename: true } },
      },
    }),
    prisma.sale.count({ where: unmatchedOnly ? { productId: null } : undefined }),
    prisma.sale.findMany({
      where: { productId: null },
      select: { rawItem: true, quantity: true, lineTotal: true },
    }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const sales: LedgerSale[] = rows.map((r) => ({
    id: r.id,
    saleDate: r.saleDate,
    item: r.product?.name ?? r.rawItem,
    sku: r.rawSku,
    quantity: r.quantity,
    lineTotal: r.lineTotal,
    profit: r.unitCost != null ? r.lineTotal - r.unitCost * r.quantity : null,
    matched: r.productId != null,
    batchFile: r.batch?.filename ?? null,
  }));

  const groups = new Map<string, UnmatchedGroup>();
  for (const r of unmatchedRows) {
    const key = r.rawItem;
    let g = groups.get(key);
    if (!g) {
      g = { raw: key, count: 0, units: 0, revenue: 0 };
      groups.set(key, g);
    }
    g.count += 1;
    g.units += r.quantity;
    g.revenue += r.lineTotal;
  }
  const unmatched = [...groups.values()].sort((a, b) => b.revenue - a.revenue);

  return { sales, totalCount, unmatched, productOptions: products };
}

export async function getCategories(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}
