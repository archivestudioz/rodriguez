// Pure helpers for the flexible SD-card importer. The Royal 7000ML's exact
// export layout is unknown, so we detect columns heuristically and let the
// user correct the mapping before anything is saved.

export const IMPORT_FIELDS = [
  { key: "saleDate", label: "Date", required: true },
  { key: "item", label: "Item name", required: true },
  { key: "sku", label: "PLU / SKU", required: false },
  { key: "quantity", label: "Quantity", required: false },
  { key: "unitPrice", label: "Unit price", required: false },
  { key: "lineTotal", label: "Line total", required: false },
  { key: "category", label: "Category", required: false },
] as const;

export type FieldKey = (typeof IMPORT_FIELDS)[number]["key"];

export type ColumnMapping = Partial<Record<FieldKey, string>>;

/** Normalize a label for matching (aliases, product names, headers). */
export function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const HEADER_HINTS: Record<FieldKey, string[]> = {
  saleDate: ["date", "time", "day", "datetime", "trans date", "sold"],
  item: ["item", "description", "name", "product", "plu name", "article"],
  sku: ["plu", "sku", "code", "barcode", "upc", "number", "id"],
  quantity: ["qty", "quantity", "count", "units", "sold qty", "pieces"],
  unitPrice: ["price", "unit price", "each", "unit", "amount each"],
  lineTotal: ["total", "amount", "line total", "sales", "ext", "value", "net"],
  category: ["category", "dept", "department", "group", "class"],
};

/** Best-guess mapping from a file's headers to our fields. */
export function guessMapping(headers: string[]): ColumnMapping {
  const norm = headers.map((h) => ({ raw: h, n: normalizeKey(h) }));
  const used = new Set<string>();
  const mapping: ColumnMapping = {};

  for (const field of IMPORT_FIELDS) {
    const hints = HEADER_HINTS[field.key];
    // exact-ish match first, then substring
    let hit =
      norm.find((h) => !used.has(h.raw) && hints.some((k) => h.n === k)) ||
      norm.find(
        (h) => !used.has(h.raw) && hints.some((k) => h.n.includes(k)),
      );
    if (hit) {
      mapping[field.key] = hit.raw;
      used.add(hit.raw);
    }
  }
  return mapping;
}

/** Parse "$1,234.50", "(3.00)", "1 234,50" → number. */
export function parseNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (v == null) return 0;
  let s = String(v).trim();
  if (!s) return 0;
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()]/g, "").replace(/[^0-9.,-]/g, "");
  // If both separators present, assume comma = thousands.
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/,/g, "");
  } else if (s.includes(",") && !s.includes(".")) {
    // lone comma: treat as decimal if it looks like one (e.g. 1,50)
    s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  if (Number.isNaN(n)) return 0;
  return negative && n > 0 ? -n : n;
}

/** Try hard to read a date out of whatever the register wrote. */
export function parseDateFlexible(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;

  // Native parse handles ISO and many US formats.
  const native = new Date(s);
  if (!Number.isNaN(native.getTime())) return native;

  // MM/DD/YYYY or MM-DD-YY (with optional time)
  const m = s.match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?/,
  );
  if (m) {
    let [, mo, da, yr, hh, mm] = m;
    let year = parseInt(yr, 10);
    if (year < 100) year += 2000;
    const d = new Date(
      year,
      parseInt(mo, 10) - 1,
      parseInt(da, 10),
      hh ? parseInt(hh, 10) : 12,
      mm ? parseInt(mm, 10) : 0,
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export type ParsedRow = {
  saleDate: Date | null;
  item: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  category: string | null;
};

/**
 * Turn a raw file row into a normalized sale line using the mapping.
 * Fills in quantity/price/total from each other when the register only
 * reports some of them.
 */
export function applyMapping(
  row: Record<string, unknown>,
  mapping: ColumnMapping,
): ParsedRow {
  const get = (k: FieldKey) => (mapping[k] ? row[mapping[k] as string] : undefined);

  const item = String(get("item") ?? "").trim();
  const skuRaw = get("sku");
  const sku = skuRaw != null && String(skuRaw).trim() ? String(skuRaw).trim() : null;
  const categoryRaw = get("category");
  const category =
    categoryRaw != null && String(categoryRaw).trim()
      ? String(categoryRaw).trim()
      : null;

  let quantity = mapping.quantity ? parseNumber(get("quantity")) : 0;
  let unitPrice = mapping.unitPrice ? parseNumber(get("unitPrice")) : 0;
  let lineTotal = mapping.lineTotal ? parseNumber(get("lineTotal")) : 0;

  if (quantity === 0) quantity = 1;
  if (lineTotal === 0 && unitPrice !== 0) lineTotal = unitPrice * quantity;
  if (unitPrice === 0 && lineTotal !== 0 && quantity !== 0)
    unitPrice = lineTotal / quantity;

  return {
    saleDate: parseDateFlexible(get("saleDate")),
    item,
    sku,
    quantity,
    unitPrice,
    lineTotal,
    category,
  };
}
