// The Rodriguez mark: a cross set within a radiant halo.
// Drawn geometrically so it stays crisp at any size — no raster, no emoji.

export function Sigil({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* radiant rays */}
      <g stroke="hsl(var(--gold))" strokeWidth="1.4" strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * Math.PI) / 6;
          const inner = 15.5;
          const outer = i % 3 === 0 ? 21.5 : 19;
          const cx = 24;
          const cy = 24;
          return (
            <line
              key={i}
              x1={cx + inner * Math.cos(a)}
              y1={cy + inner * Math.sin(a)}
              x2={cx + outer * Math.cos(a)}
              y2={cy + outer * Math.sin(a)}
              opacity={i % 3 === 0 ? 0.9 : 0.5}
            />
          );
        })}
      </g>
      {/* halo ring */}
      <circle cx="24" cy="24" r="13" stroke="hsl(var(--gold-deep))" strokeWidth="1.4" />
      {/* cross */}
      <g fill="hsl(var(--foreground))">
        <rect x="22.4" y="15" width="3.2" height="18" rx="0.6" />
        <rect x="18" y="20.4" width="12" height="3.2" rx="0.6" />
      </g>
    </svg>
  );
}
