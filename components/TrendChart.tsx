"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { TrendPoint } from "@/lib/queries";
import { money } from "@/lib/format";

const GOLD = "hsl(43, 74%, 52%)";
const INK = "hsl(40, 22%, 9%)";
const GRID = "hsl(43, 28%, 86%)";
const MUTED = "hsl(40, 12%, 37%)";

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const rev = payload.find((p: any) => p.dataKey === "revenue")?.value ?? 0;
  const profit = payload.find((p: any) => p.dataKey === "profit")?.value ?? 0;
  return (
    <div className="card px-3 py-2 text-[12px] shadow-sm">
      <div className="mb-1 font-serif text-[13px]">{label}</div>
      <div className="flex items-center justify-between gap-6">
        <span className="text-muted-foreground">Revenue</span>
        <span className="font-numeric">{money(rev)}</span>
      </div>
      <div className="flex items-center justify-between gap-6">
        <span className="text-muted-foreground">Profit</span>
        <span className="font-numeric" style={{ color: "hsl(42,68%,34%)" }}>
          {money(profit)}
        </span>
      </div>
    </div>
  );
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="card p-4">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tick={{ fill: MUTED, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: MUTED, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)}
            />
            <Tooltip cursor={{ fill: "hsl(43,70%,90%)", opacity: 0.5 }} content={<TooltipBox />} />
            <Bar dataKey="revenue" fill={GOLD} radius={[3, 3, 0, 0]} maxBarSize={34} />
            <Line
              dataKey="profit"
              type="monotone"
              stroke={INK}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: INK }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-5 px-1 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: GOLD }} />
          Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-4" style={{ background: INK }} />
          Profit
        </span>
      </div>
    </div>
  );
}
