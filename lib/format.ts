const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return USD.format(n);
}

/** Compact currency for large KPI figures, e.g. $12.4k. */
export function moneyCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1000) {
    return "$" + (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return USD0.format(n);
}

export function percent(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n) || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function qty(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
