"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sigil } from "./Sigil";

const NAV = [
  { href: "/", label: "Sanctuary", hint: "Overview" },
  { href: "/products", label: "The Provision", hint: "Catalog & margins" },
  { href: "/import", label: "The Offering", hint: "Import sales" },
  { href: "/sales", label: "The Ledger", hint: "All transactions" },
];

function Glyph({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "/":
      return (
        <svg {...common}>
          <path d="M3 12l9-8 9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M12 14v3" />
        </svg>
      );
    case "/products":
      return (
        <svg {...common}>
          <path d="M3 7l9-4 9 4-9 4-9-4z" />
          <path d="M3 7v10l9 4 9-4V7" />
          <path d="M12 11v10" />
        </svg>
      );
    case "/import":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M4 21h16" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M5 4h11l3 3v13H5z" />
          <path d="M8 9h7M8 13h7M8 17h4" />
        </svg>
      );
  }
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 flex flex-col border-r border-border bg-card"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Wordmark */}
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-center gap-3">
          <Sigil size={34} />
          <div className="leading-none">
            <div className="wordmark text-[19px]">Rodriguez</div>
            <div className="mt-1 text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
              Ledger of Provision
            </div>
          </div>
        </Link>
      </div>

      <div className="mx-5 rule-gold" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-5">
        <div className="px-2 pb-2 eyebrow">Chapters</div>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                    active
                      ? "bg-foreground text-[hsl(var(--primary-foreground))]"
                      : "text-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  <span
                    className={
                      active ? "text-gold" : "text-muted-foreground group-hover:text-foreground"
                    }
                  >
                    <Glyph name={item.href} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[14px] font-semibold leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={[
                        "text-[11px] leading-tight",
                        active
                          ? "text-[hsl(var(--gold-soft))]"
                          : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {item.hint}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Devotional footer */}
      <div className="px-5 pb-6">
        <div className="mx-1 mb-4 rule-gold" />
        <p className="font-serif text-[13px] italic leading-snug text-muted-foreground">
          &ldquo;Give us this day our daily bread.&rdquo;
        </p>
        <p className="mt-1.5 text-[10px] tracking-[0.16em] uppercase text-muted-foreground/70">
          Every loaf accounted for
        </p>
        <a
          href="/api/logout"
          className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
          Sign out
        </a>
      </div>
    </aside>
  );
}
