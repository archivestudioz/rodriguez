"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignAlias } from "@/app/actions";
import type { UnmatchedGroup } from "@/lib/queries";
import { money, qty } from "@/lib/format";

export function Reconciler({
  groups,
  productOptions,
}: {
  groups: UnmatchedGroup[];
  productOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  if (groups.length === 0) {
    return (
      <div className="card flex items-center gap-3 px-5 py-5">
        <span className="badge badge-gold">All clear</span>
        <p className="text-[14px] text-muted-foreground">
          Every sold line is matched to a catalog item. Profit is fully counted.
        </p>
      </div>
    );
  }

  function assign(raw: string) {
    const productId = choices[raw];
    if (!productId) return;
    const fd = new FormData();
    fd.set("raw", raw);
    fd.set("productId", productId);
    setBusy(raw);
    start(async () => {
      await assignAlias(fd);
      setBusy(null);
      router.refresh();
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border bg-muted/60 px-5 py-3">
        <h3 className="font-serif text-lg">Unmatched labels</h3>
        <p className="text-[12px] text-muted-foreground">
          Point each register label to a catalog item. Rodriguez remembers the link and
          backfills every past sale with that label.
        </p>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Register label</th>
            <th className="num">Lines</th>
            <th className="num">Units</th>
            <th className="num">Revenue</th>
            <th>Map to item</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.raw}>
              <td className="font-medium">{g.raw}</td>
              <td className="num text-muted-foreground">{g.count}</td>
              <td className="num text-muted-foreground">{qty(g.units)}</td>
              <td className="num">{money(g.revenue)}</td>
              <td>
                <select
                  className="field h-9"
                  value={choices[g.raw] ?? ""}
                  onChange={(e) => setChoices((c) => ({ ...c, [g.raw]: e.target.value }))}
                >
                  <option value="">Choose item…</option>
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </td>
              <td className="num">
                <button
                  className="btn btn-sm btn-gold"
                  disabled={!choices[g.raw] || (pending && busy === g.raw)}
                  onClick={() => assign(g.raw)}
                >
                  {pending && busy === g.raw ? "…" : "Link"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
