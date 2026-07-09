// Server-safe presentational building blocks — no hooks, no client state.
import { percent } from "@/lib/format";

export function PageHeader({
  eyebrow,
  title,
  verse,
  actions,
}: {
  eyebrow: string;
  title: string;
  verse?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="halo border-b border-border">
      <div
        className="mx-auto flex flex-col gap-4 px-8 py-8 md:flex-row md:items-end md:justify-between"
        style={{ maxWidth: "var(--content-max)" }}
      >
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="display mt-2 text-4xl">{title}</h1>
          {verse && (
            <p className="mt-2 font-serif text-[15px] italic text-muted-foreground">
              {verse}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Content({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto px-8 py-8"
      style={{ maxWidth: "var(--content-max)" }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <h2 className="font-serif text-xl">{children}</h2>
      {hint && <span className="text-[12px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function Kpi({
  label,
  value,
  sub,
  accent,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  delta?: React.ReactNode;
}) {
  return (
    <div
      className={[
        "card p-5 flex flex-col justify-between",
        accent ? "relative overflow-hidden" : "",
      ].join(" ")}
    >
      {accent && (
        <span className="absolute inset-x-0 top-0 h-[3px] bg-gold" aria-hidden />
      )}
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {delta}
      </div>
      <div className="mt-3 font-numeric text-[30px] font-semibold leading-none tracking-tight">
        {value}
      </div>
      {sub && <div className="mt-2 text-[12px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** Percentage change between two figures, arrow + color. */
export function DeltaPill({
  current,
  previous,
  goodWhenUp = true,
}: {
  current: number;
  previous: number;
  goodWhenUp?: boolean;
}) {
  if (previous === 0 && current === 0) return null;
  const change = previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;
  const up = current >= previous;
  const good = up === goodWhenUp;
  return (
    <span
      className="badge"
      style={{
        backgroundColor: good ? "hsl(var(--gold-soft))" : "hsl(var(--negative) / 0.1)",
        color: good ? "hsl(var(--gold-deep))" : "hsl(var(--negative))",
        border: `1px solid ${good ? "hsl(var(--gold) / 0.4)" : "hsl(var(--negative) / 0.3)"}`,
      }}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {change == null ? "new" : percent(Math.abs(change), 0)}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold-soft">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--gold-deep))" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M4 21h16" />
        </svg>
      </div>
      <h3 className="font-serif text-xl">{title}</h3>
      <p className="max-w-sm text-[14px] text-muted-foreground">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
