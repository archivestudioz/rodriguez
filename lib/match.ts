import { normalizeKey } from "./csv";

export type CatalogEntry = {
  id: string;
  name: string;
  sku: string | null;
  unitCost: number;
};

export type MatchIndex = {
  bySku: Map<string, CatalogEntry>;
  byName: Map<string, CatalogEntry>;
  byAlias: Map<string, string>; // normalized raw -> productId
  byId: Map<string, CatalogEntry>;
};

export function buildIndex(
  products: CatalogEntry[],
  aliases: { raw: string; productId: string }[],
): MatchIndex {
  const bySku = new Map<string, CatalogEntry>();
  const byName = new Map<string, CatalogEntry>();
  const byId = new Map<string, CatalogEntry>();
  for (const p of products) {
    byId.set(p.id, p);
    if (p.sku) bySku.set(normalizeKey(p.sku), p);
    byName.set(normalizeKey(p.name), p);
  }
  const byAlias = new Map<string, string>();
  for (const a of aliases) byAlias.set(normalizeKey(a.raw), a.productId);
  return { bySku, byName, byAlias, byId };
}

export type Resolution = {
  productId: string | null;
  unitCost: number | null;
  via: "sku" | "alias" | "name" | null;
};

/** Resolve a raw import row to a catalog product + its cost snapshot. */
export function resolve(
  index: MatchIndex,
  rawItem: string,
  rawSku: string | null,
): Resolution {
  if (rawSku) {
    const bySku = index.bySku.get(normalizeKey(rawSku));
    if (bySku) return { productId: bySku.id, unitCost: bySku.unitCost, via: "sku" };
  }
  // alias keyed by sku or by item label
  const aliasKey = rawSku ? normalizeKey(rawSku) : normalizeKey(rawItem);
  const aliasId = index.byAlias.get(aliasKey) ?? index.byAlias.get(normalizeKey(rawItem));
  if (aliasId) {
    const p = index.byId.get(aliasId);
    if (p) return { productId: p.id, unitCost: p.unitCost, via: "alias" };
  }
  const byName = index.byName.get(normalizeKey(rawItem));
  if (byName) return { productId: byName.id, unitCost: byName.unitCost, via: "name" };

  return { productId: null, unitCost: null, via: null };
}
