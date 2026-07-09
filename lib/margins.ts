// Profit math. The register knows the sale price; the catalog knows the cost.
// Margin only exists where the two meet.

export type SaleLike = {
  quantity: number;
  lineTotal: number;
  unitCost: number | null;
};

export function costOf(sale: SaleLike): number | null {
  if (sale.unitCost == null) return null;
  return sale.unitCost * sale.quantity;
}

export function profitOf(sale: SaleLike): number | null {
  const c = costOf(sale);
  if (c == null) return null;
  return sale.lineTotal - c;
}

/** Margin % = profit / revenue. Null when cost is unknown or revenue is 0. */
export function marginPct(revenue: number, profit: number | null): number | null {
  if (profit == null) return null;
  if (revenue === 0) return null;
  return (profit / revenue) * 100;
}

/** Markup % = profit / cost — how much you mark up over what you paid. */
export function markupPct(cost: number, profit: number | null): number | null {
  if (profit == null) return null;
  if (cost === 0) return null;
  return (profit / cost) * 100;
}

export type Totals = {
  revenue: number;
  cost: number;
  profit: number;
  units: number;
  lines: number;
  /** Revenue from lines whose cost is known (margin is only meaningful here). */
  costedRevenue: number;
  /** Lines missing a cost — their profit can't be computed yet. */
  uncostedLines: number;
  uncostedRevenue: number;
};

export function emptyTotals(): Totals {
  return {
    revenue: 0,
    cost: 0,
    profit: 0,
    units: 0,
    lines: 0,
    costedRevenue: 0,
    uncostedLines: 0,
    uncostedRevenue: 0,
  };
}

export function accumulate(t: Totals, sale: SaleLike): Totals {
  t.revenue += sale.lineTotal;
  t.units += sale.quantity;
  t.lines += 1;
  const c = costOf(sale);
  if (c == null) {
    t.uncostedLines += 1;
    t.uncostedRevenue += sale.lineTotal;
  } else {
    t.cost += c;
    t.profit += sale.lineTotal - c;
    t.costedRevenue += sale.lineTotal;
  }
  return t;
}

export function sumTotals(sales: SaleLike[]): Totals {
  return sales.reduce(accumulate, emptyTotals());
}

/** Margin % computed against costed revenue only, so unknown costs don't
 *  silently deflate the number. */
export function totalsMargin(t: Totals): number | null {
  return marginPct(t.costedRevenue, t.profit);
}
