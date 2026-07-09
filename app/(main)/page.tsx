import Link from "next/link";
import { getDashboard, getYearOverview } from "@/lib/queries";
import { isPeriod, PERIODS, Period } from "@/lib/dates";
import { money, moneyCompact, percent, qty } from "@/lib/format";
import { PageHeader, Content, Kpi, DeltaPill, SectionTitle, EmptyState } from "@/components/kit";
import { PeriodTabs } from "@/components/PeriodTabs";
import { TrendChart } from "@/components/TrendChart";
import type { TopItem, YearOverview } from "@/lib/queries";

export const dynamic = "force-dynamic";

function YearBand({ y }: { y: YearOverview }) {
  const figures = [
    { label: "Revenue", value: money(y.revenue), gold: true },
    { label: "Profit", value: money(y.profit), gold: true },
    { label: "Profit margin", value: percent(y.margin) },
    { label: "Units sold", value: qty(y.units) },
  ];
  return (
    <div className="panel-ink relative overflow-hidden rounded-xl p-6">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-gold" aria-hidden />
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
          {figures.map((f) => (
            <div key={f.label}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--gold-soft))]">
                {f.label}
              </div>
              <div
                className="mt-1 font-numeric text-[28px] font-semibold leading-none"
                style={f.gold ? { color: "hsl(var(--gold))" } : undefined}
              >
                {f.value}
              </div>
            </div>
          ))}
        </div>
        <div className="shrink-0 md:text-right">
          <div className="eyebrow" style={{ color: "hsl(var(--gold-soft))" }}>
            Year overall
          </div>
          <div className="mt-1 font-serif text-[15px] italic text-[hsl(var(--muted))]">
            Past 12 months
          </div>
          {y.bestMonth && (
            <div className="mt-1 text-[12px] text-[hsl(var(--gold-soft))]">
              Best month: {y.bestMonth.label} · {moneyCompact(y.bestMonth.revenue)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopTable({ rows, metric }: { rows: TopItem[]; metric: "profit" | "revenue" }) {
  if (rows.length === 0) {
    return (
      <div className="card px-4 py-10 text-center text-[13px] text-muted-foreground">
        No sales in this period yet.
      </div>
    );
  }
  return (
    <div className="card overflow-hidden">
      <table className="tbl">
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Units</th>
            <th className="num">Revenue</th>
            <th className="num">{metric === "profit" ? "Profit" : "Margin"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>
                <div className="font-medium">{r.name}</div>
                <div className="text-[11px] text-muted-foreground">{r.category}</div>
              </td>
              <td className="num text-muted-foreground">{qty(r.units)}</td>
              <td className="num">{money(r.revenue)}</td>
              <td className="num font-semibold">
                {metric === "profit" ? (
                  r.profit != null ? (
                    <span style={{ color: "hsl(42,68%,34%)" }}>{money(r.profit)}</span>
                  ) : (
                    <span className="badge badge-muted">no cost</span>
                  )
                ) : r.margin != null ? (
                  percent(r.margin)
                ) : (
                  <span className="badge badge-muted">no cost</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period: Period = isPeriod(sp.period) ? sp.period : "day";
  const [d, year] = await Promise.all([getDashboard(period), getYearOverview()]);
  const noun = PERIODS.find((p) => p.key === period)!.noun;

  const verse =
    period === "day"
      ? "The provision of this day, counted and kept."
      : period === "week"
        ? "Seven days of labor, gathered into one account."
        : period === "month"
          ? "A season's increase, weighed with honest measure."
          : "A quarter's harvest, told in full.";

  return (
    <>
      <PageHeader
        eyebrow={`Sanctuary · ${noun}`}
        title="The Ledger of Provision"
        verse={verse}
        actions={<PeriodTabs active={period} />}
      />

      <Content>
        {!d.hasData ? (
          <EmptyState
            title="No sales recorded yet"
            body="Begin by naming your goods and their cost in The Provision, then bring in a day of sales from the register's SD card."
            action={
              <div className="flex gap-2">
                <Link href="/products" className="btn btn-primary">Set up items</Link>
                <Link href="/import" className="btn btn-gold">Import sales</Link>
              </div>
            }
          />
        ) : (
          <>
            {/* Yearly overall */}
            <div className="mb-8">
              <YearBand y={year} />
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi
                label={`Revenue · ${noun}`}
                value={money(d.current.revenue)}
                delta={<DeltaPill current={d.current.revenue} previous={d.previous.revenue} />}
                sub={`Prior ${period}: ${moneyCompact(d.previous.revenue)}`}
              />
              <Kpi
                label={`Profit · ${noun}`}
                value={money(d.current.profit)}
                accent
                delta={<DeltaPill current={d.current.profit} previous={d.previous.profit} />}
                sub={`Cost of goods: ${moneyCompact(d.current.cost)}`}
              />
              <Kpi
                label="Profit margin"
                value={percent(d.margin)}
                delta={
                  d.margin != null && d.prevMargin != null ? (
                    <DeltaPill current={d.margin} previous={d.prevMargin} />
                  ) : undefined
                }
                sub="On items with a known cost"
              />
              <Kpi
                label="Units sold"
                value={qty(d.current.units)}
                delta={<DeltaPill current={d.current.units} previous={d.previous.units} />}
                sub={`${d.current.lines} line items`}
              />
            </div>

            {/* Catalog gaps notice */}
            {d.gapsInRange > 0 && (
              <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-gold/40 bg-gold-soft px-4 py-3">
                <div className="text-[13px]">
                  <span className="font-semibold">{d.gapsInRange} sold line(s)</span>{" "}
                  in this period have no matching item cost, so their profit isn&apos;t counted yet.
                </div>
                <Link href="/sales?filter=unmatched" className="btn btn-sm btn-gold shrink-0">
                  Reconcile
                </Link>
              </div>
            )}

            {/* Trend */}
            <div className="mt-8">
              <SectionTitle hint={`Last ${d.trend.length} ${period}s`}>
                Revenue &amp; profit trend
              </SectionTitle>
              <TrendChart data={d.trend} />
            </div>

            {/* Top items */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div>
                <SectionTitle hint="This period">Most profitable items</SectionTitle>
                <TopTable rows={d.topByProfit} metric="profit" />
              </div>
              <div>
                <SectionTitle hint="This period">Best sellers by revenue</SectionTitle>
                <TopTable rows={d.topByRevenue} metric="revenue" />
              </div>
            </div>
          </>
        )}
      </Content>
    </>
  );
}
