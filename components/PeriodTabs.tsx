"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PERIODS, Period } from "@/lib/dates";

export function PeriodTabs({ active }: { active: Period }) {
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <div className="inline-flex rounded-lg border border-border-strong/25 bg-card p-1">
      {PERIODS.map((p) => {
        const isActive = p.key === active;
        const q = new URLSearchParams(params.toString());
        q.set("period", p.key);
        return (
          <Link
            key={p.key}
            href={`${pathname}?${q.toString()}`}
            scroll={false}
            className={[
              "rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              isActive
                ? "bg-foreground text-[hsl(var(--primary-foreground))]"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
