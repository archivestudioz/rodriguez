import Link from "next/link";
import { getLedger } from "@/lib/queries";
import { PageHeader, Content, SectionTitle, EmptyState } from "@/components/kit";
import { Reconciler } from "@/components/Reconciler";
import { money, qty } from "@/lib/format";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const unmatchedOnly = sp.filter === "unmatched";
  const { sales, totalCount, unmatched, productOptions } = await getLedger(unmatchedOnly);

  return (
    <>
      <PageHeader
        eyebrow="The Ledger"
        title="Every transaction, remembered"
        verse="Nothing bought or sold escapes the record."
        actions={
          <div className="inline-flex rounded-lg border border-border-strong/25 bg-card p-1">
            <Link
              href="/sales"
              className={[
                "rounded-md px-3.5 py-1.5 text-[13px] font-semibold",
                !unmatchedOnly ? "bg-foreground text-[hsl(var(--primary-foreground))]" : "text-muted-foreground",
              ].join(" ")}
            >
              All
            </Link>
            <Link
              href="/sales?filter=unmatched"
              className={[
                "rounded-md px-3.5 py-1.5 text-[13px] font-semibold",
                unmatchedOnly ? "bg-foreground text-[hsl(var(--primary-foreground))]" : "text-muted-foreground",
              ].join(" ")}
            >
              Needs cost {unmatched.length > 0 && <span className="ml-1">({unmatched.length})</span>}
            </Link>
          </div>
        }
      />
      <Content>
        {totalCount === 0 && unmatched.length === 0 ? (
          <EmptyState
            title="The ledger is empty"
            body="Once you import a day of sales from the register, every line appears here."
            action={<Link href="/import" className="btn btn-gold">Import sales</Link>}
          />
        ) : (
          <div className="space-y-8">
            {unmatched.length > 0 && (
              <div>
                <SectionTitle hint={`${unmatched.length} label(s) without a cost`}>
                  Reconcile costs
                </SectionTitle>
                <Reconciler groups={unmatched} productOptions={productOptions} />
              </div>
            )}

            <div>
              <SectionTitle hint={`Showing ${sales.length} of ${totalCount}`}>
                {unmatchedOnly ? "Unmatched sales" : "Recent sales"}
              </SectionTitle>
              <div className="card overflow-x-auto">
                <table className="tbl min-w-[680px]">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Item</th>
                      <th>PLU</th>
                      <th className="num">Qty</th>
                      <th className="num">Total</th>
                      <th className="num">Profit</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => (
                      <tr key={s.id}>
                        <td className="font-numeric text-[12px] text-muted-foreground">
                          {format(s.saleDate, "MMM d, yyyy")}
                        </td>
                        <td>
                          <span className={s.matched ? "font-medium" : ""}>{s.item}</span>
                          {!s.matched && (
                            <span className="badge badge-muted ml-2">no cost</span>
                          )}
                        </td>
                        <td className="font-numeric text-[12px] text-muted-foreground">{s.sku ?? "—"}</td>
                        <td className="num text-muted-foreground">{qty(s.quantity)}</td>
                        <td className="num">{money(s.lineTotal)}</td>
                        <td className="num font-semibold">
                          {s.profit != null ? (
                            <span style={{ color: s.profit >= 0 ? "hsl(42,68%,34%)" : "hsl(0,55%,42%)" }}>
                              {money(s.profit)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="text-[12px] text-muted-foreground font-numeric">
                          {s.batchFile ?? "manual"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Content>
    </>
  );
}
