"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct, deleteProduct } from "@/app/actions";
import type { ProductRow } from "@/lib/queries";
import { money, percent, qty } from "@/lib/format";

type Draft = {
  id?: string;
  name: string;
  sku: string;
  category: string;
  unitCost: string;
  salePrice: string;
  unit: string;
};

const EMPTY: Draft = {
  name: "",
  sku: "",
  category: "",
  unitCost: "",
  salePrice: "",
  unit: "each",
};

function marginOf(cost: number, price: number) {
  const profit = price - cost;
  const pct = price > 0 ? (profit / price) * 100 : null;
  return { profit, pct };
}

export function ProductManager({
  products,
  categories,
}: {
  products: ProductRow[];
  categories: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");

  const filtered = products.filter(
    (p) =>
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase()),
  );

  function openNew() {
    setError(null);
    setDraft({ ...EMPTY });
  }
  function openEdit(p: ProductRow) {
    setError(null);
    setDraft({
      id: p.id,
      name: p.name,
      sku: p.sku ?? "",
      category: p.category,
      unitCost: String(p.unitCost),
      salePrice: String(p.salePrice),
      unit: p.unit,
    });
  }

  function save() {
    if (!draft) return;
    setError(null);
    const fd = new FormData();
    if (draft.id) fd.set("id", draft.id);
    fd.set("name", draft.name);
    fd.set("sku", draft.sku);
    fd.set("category", draft.category || "Uncategorized");
    fd.set("unitCost", draft.unitCost || "0");
    fd.set("salePrice", draft.salePrice || "0");
    fd.set("unit", draft.unit || "each");
    start(async () => {
      const res = draft.id ? await updateProduct(fd) : await createProduct(fd);
      if (res?.ok) {
        setDraft(null);
        router.refresh();
      } else {
        setError(res?.error ?? "Something went wrong.");
      }
    });
  }

  function remove(p: ProductRow) {
    if (!confirm(`Delete "${p.name}"? Its past sales stay, but lose their cost link.`)) return;
    const fd = new FormData();
    fd.set("id", p.id);
    start(async () => {
      await deleteProduct(fd);
      router.refresh();
    });
  }

  const previewMargin =
    draft != null
      ? marginOf(parseFloat(draft.unitCost || "0"), parseFloat(draft.salePrice || "0"))
      : null;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <input
          className="field max-w-xs"
          placeholder="Search items, PLU, category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-gold" onClick={openNew}>
          + Add item
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="tbl min-w-[720px]">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th className="num">Cost</th>
              <th className="num">Price</th>
              <th className="num">Margin</th>
              <th className="num">Sold</th>
              <th className="num">Revenue</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-muted-foreground">
                  {products.length === 0
                    ? "No items yet. Add your first product to start tracking margins."
                    : "No items match your search."}
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const m = marginOf(p.unitCost, p.salePrice);
              return (
                <tr key={p.id}>
                  <td>
                    <div className="font-medium">{p.name}</div>
                    {p.sku && (
                      <div className="font-numeric text-[11px] text-muted-foreground">
                        PLU {p.sku}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-muted">{p.category}</span>
                  </td>
                  <td className="num">{money(p.unitCost)}</td>
                  <td className="num">{money(p.salePrice)}</td>
                  <td className="num">
                    <div className="font-semibold" style={{ color: m.profit >= 0 ? "hsl(42,68%,34%)" : "hsl(0,55%,42%)" }}>
                      {percent(m.pct)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{money(m.profit)}/{p.unit}</div>
                  </td>
                  <td className="num text-muted-foreground">{qty(p.unitsSold)}</td>
                  <td className="num">{money(p.revenue)}</td>
                  <td className="num whitespace-nowrap">
                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(p)}>
                      Edit
                    </button>{" "}
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => remove(p)}
                      style={{ color: "hsl(0,55%,42%)" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Editor modal */}
      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(20,17,13,0.5)" }}
          onClick={() => !pending && setDraft(null)}
        >
          <div
            className="card w-full max-w-lg p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="font-serif text-xl">{draft.id ? "Edit item" : "New item"}</h3>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setDraft(null)}>
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 px-6 py-5">
              <div className="col-span-2">
                <label className="label">Item name</label>
                <input
                  className="field mt-1"
                  value={draft.name}
                  autoFocus
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">PLU / SKU</label>
                <input
                  className="field mt-1 font-numeric"
                  value={draft.sku}
                  placeholder="optional"
                  onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Category</label>
                <input
                  className="field mt-1"
                  list="cat-list"
                  value={draft.category}
                  placeholder="e.g. Beverages"
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                />
                <datalist id="cat-list">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="label">Unit cost (wholesale)</label>
                <input
                  className="field mt-1 font-numeric"
                  inputMode="decimal"
                  value={draft.unitCost}
                  placeholder="0.00"
                  onChange={(e) => setDraft({ ...draft, unitCost: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Sale price (retail)</label>
                <input
                  className="field mt-1 font-numeric"
                  inputMode="decimal"
                  value={draft.salePrice}
                  placeholder="0.00"
                  onChange={(e) => setDraft({ ...draft, salePrice: e.target.value })}
                />
              </div>
              <div className="col-span-2 rounded-lg border border-gold/40 bg-gold-soft px-4 py-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Profit per unit</span>
                  <span className="font-numeric font-semibold">
                    {money(previewMargin?.profit ?? 0)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Margin</span>
                  <span className="font-numeric font-semibold" style={{ color: "hsl(42,68%,34%)" }}>
                    {percent(previewMargin?.pct ?? null)}
                  </span>
                </div>
              </div>
              {error && (
                <div className="col-span-2 text-[13px]" style={{ color: "hsl(0,55%,42%)" }}>
                  {error}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button className="btn btn-ghost" onClick={() => setDraft(null)} disabled={pending}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={save} disabled={pending || !draft.name.trim()}>
                {pending ? "Saving…" : draft.id ? "Save changes" : "Add item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
