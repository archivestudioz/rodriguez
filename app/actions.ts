"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildIndex, resolve, CatalogEntry } from "@/lib/match";
import { normalizeKey } from "@/lib/csv";
import { round2 } from "@/lib/format";

/* ----------------------------- Products ----------------------------- */

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sku: z.string().trim().optional().transform((v) => (v ? v : null)),
  category: z.string().trim().default("Uncategorized"),
  unitCost: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0).default(0),
  unit: z.string().trim().default("each"),
});

export async function createProduct(formData: FormData) {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  try {
    await prisma.product.create({
      data: {
        name: d.name,
        sku: d.sku,
        category: d.category || "Uncategorized",
        unitCost: round2(d.unitCost),
        salePrice: round2(d.salePrice),
        unit: d.unit || "each",
      },
    });
  } catch (e: unknown) {
    return { ok: false, error: "That PLU/SKU is already used by another item." };
  }
  revalidatePath("/products");
  revalidatePath("/");
  return { ok: true };
}

export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing product id" };
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  try {
    await prisma.product.update({
      where: { id },
      data: {
        name: d.name,
        sku: d.sku,
        category: d.category || "Uncategorized",
        unitCost: round2(d.unitCost),
        salePrice: round2(d.salePrice),
        unit: d.unit || "each",
      },
    });
  } catch {
    return { ok: false, error: "That PLU/SKU is already used by another item." };
  }
  revalidatePath("/products");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing product id" };
  await prisma.product.delete({ where: { id } });
  revalidatePath("/products");
  revalidatePath("/");
  return { ok: true };
}

/* ------------------------------ Import ------------------------------ */

const importRowSchema = z.object({
  saleDate: z.string().nullable(),
  item: z.string(),
  sku: z.string().nullable(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
  category: z.string().nullable(),
});

const importSchema = z.object({
  filename: z.string().default("import.csv"),
  mapping: z.record(z.string(), z.string()).default({}),
  rows: z.array(importRowSchema).max(20000),
});

export type ImportResult =
  | { ok: true; imported: number; matched: number; skipped: number; batchId: string }
  | { ok: false; error: string };

export async function commitImport(payloadJson: string): Promise<ImportResult> {
  let payload: z.infer<typeof importSchema>;
  try {
    payload = importSchema.parse(JSON.parse(payloadJson));
  } catch {
    return { ok: false, error: "Could not read the import payload." };
  }
  if (payload.rows.length === 0) {
    return { ok: false, error: "No rows to import." };
  }

  const [products, aliases] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true, sku: true, unitCost: true } }),
    prisma.productAlias.findMany({ select: { raw: true, productId: true } }),
  ]);
  const index = buildIndex(products as CatalogEntry[], aliases);

  let matched = 0;
  let skipped = 0;
  const now = new Date();

  const data = payload.rows
    .map((r) => {
      const date = r.saleDate ? new Date(r.saleDate) : null;
      if (!date || Number.isNaN(date.getTime()) || !r.item.trim()) {
        skipped += 1;
        return null;
      }
      const res = resolve(index, r.item, r.sku);
      if (res.productId) matched += 1;
      return {
        rawItem: r.item.trim(),
        rawSku: r.sku,
        saleDate: date,
        quantity: r.quantity || 1,
        unitPrice: round2(r.unitPrice),
        lineTotal: round2(r.lineTotal),
        unitCost: res.unitCost != null ? round2(res.unitCost) : null,
        productId: res.productId,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (data.length === 0) {
    return { ok: false, error: "No valid rows (every row was missing a date or item)." };
  }

  const batch = await prisma.importBatch.create({
    data: {
      filename: payload.filename,
      source: "sd-card",
      mapping: JSON.stringify(payload.mapping),
      rowCount: data.length,
      matchedCount: matched,
      importedAt: now,
      sales: { create: data },
    },
  });

  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath("/import");
  return { ok: true, imported: data.length, matched, skipped, batchId: batch.id };
}

/* --------------------------- Manual entry --------------------------- */

const manualSchema = z.object({
  productId: z.string().min(1),
  saleDate: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0).optional(),
});

export async function addManualSale(formData: FormData) {
  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const product = await prisma.product.findUnique({ where: { id: d.productId } });
  if (!product) return { ok: false, error: "Product not found." };

  const unitPrice = d.unitPrice != null && d.unitPrice > 0 ? d.unitPrice : product.salePrice;
  const date = new Date(d.saleDate);
  await prisma.sale.create({
    data: {
      productId: product.id,
      rawItem: product.name,
      rawSku: product.sku,
      saleDate: Number.isNaN(date.getTime()) ? new Date() : date,
      quantity: d.quantity,
      unitPrice: round2(unitPrice),
      lineTotal: round2(unitPrice * d.quantity),
      unitCost: round2(product.unitCost),
    },
  });
  revalidatePath("/");
  revalidatePath("/sales");
  return { ok: true };
}

/* ------------------------ Reconcile unmatched ----------------------- */

/**
 * Map a raw label (from unmatched sales) to a product, remember it as an
 * alias, and backfill every existing unmatched sale that shares the label.
 */
export async function assignAlias(formData: FormData) {
  const raw = String(formData.get("raw") ?? "").trim();
  const productId = String(formData.get("productId") ?? "");
  if (!raw || !productId) return { ok: false, error: "Missing label or product." };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { ok: false, error: "Product not found." };

  const key = normalizeKey(raw);
  await prisma.productAlias.upsert({
    where: { raw: key },
    update: { productId },
    create: { raw: key, productId },
  });

  // Backfill matching unmatched sales (compare on normalized rawItem).
  const candidates = await prisma.sale.findMany({
    where: { productId: null },
    select: { id: true, rawItem: true, quantity: true },
  });
  const toFix = candidates.filter((s) => normalizeKey(s.rawItem) === key);
  await Promise.all(
    toFix.map((s) =>
      prisma.sale.update({
        where: { id: s.id },
        data: { productId, unitCost: round2(product.unitCost) },
      }),
    ),
  );

  revalidatePath("/");
  revalidatePath("/sales");
  return { ok: true, fixed: toFix.length };
}
