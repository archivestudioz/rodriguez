# Rodriguez — Ledger of Provision

A sales & profit-margin CRM for the bodega. It ingests item-level sales from the
**Royal 7000ML** cash register (via an SD-card CSV/text export), attaches your
wholesale cost to each item, and reports **revenue, cost, profit, and margin**
on a **daily / weekly / monthly / quarterly** basis.

The interface is a black · gold · ivory devotional design — clean and minimalist,
built to not look machine-generated.

---

## Why a catalog *and* an import

A cash register records what an item **sold for** — not what it **cost you**.
Margin only exists where the two meet, so Rodriguez keeps both:

- **The Provision** (`/products`) — your catalog: each item's PLU, wholesale
  **unit cost**, and retail **price**. This is where margin comes from.
- **The Offering** (`/import`) — drop the register's SD-card export; it's matched
  to the catalog by PLU or name, and each sale gets a cost snapshot.
- **The Sanctuary** (`/`) — the dashboard: KPIs, trend chart, top items, per period.
- **The Ledger** (`/sales`) — every transaction, plus a screen to reconcile any
  register label that didn't match a catalog item (mapped once, remembered forever).

---

## Run it locally

```bash
npm install
npx prisma db push      # creates the local SQLite database (prisma/dev.db)
npm run db:seed         # optional: load a demo bodega catalog + 120 days of sales
npm run dev             # http://localhost:3000
```

> If `npm install` fails with an `EACCES`/cache-permission error, your global npm
> cache has root-owned files. Either run
> `sudo chown -R $(id -u):$(id -g) ~/.npm`, or install with a fresh cache:
> `npm install --cache ./.npm-cache`.

To start over with an empty database, delete `prisma/dev.db` and re-run
`npx prisma db push`.

---

## The SD-card workflow

1. On the Royal 7000ML, run a **PLU / item sales report** and save it to the SD card.
2. Put the SD card in your computer; on the **Offering** page, drop the file in.
3. Rodriguez auto-detects the columns (Date, Item, PLU, Qty, Price, Total). Confirm
   the mapping once — it's saved with the import.
4. Unmatched items appear in **The Ledger** to be linked to a catalog item.

The importer is format-flexible on purpose: the exact 7000ML layout wasn't known
at build time, so **any CSV/text export with a header row works**, and the
column-mapping step lets you correct anything. A sample file lives in
[`sample-data/royal-7000ml-sample.csv`](sample-data/royal-7000ml-sample.csv) —
once you have a real export from your register, send it over and the auto-mapping
can be tuned to match it exactly.

---

## Deploying to Vercel (hosted, multi-device)

Local dev uses **SQLite**; Vercel's filesystem is ephemeral, so production uses
**Postgres**. You do **not** edit the schema by hand — the datasource provider is
auto-selected from `DATABASE_URL` by [`prisma/set-provider.mjs`](prisma/set-provider.mjs):
`file:…` → SQLite locally, `postgres://…` → Postgres on Vercel.

Steps:

1. Push this repo to GitHub and import it into Vercel (framework auto-detected as Next.js).
2. In the Vercel project **Storage** tab, add a **Neon Postgres** database. Vercel
   injects `DATABASE_URL` into every environment automatically.
3. Deploy. The `build` script runs
   `set-provider → prisma generate → prisma db push → next build`, which creates the
   tables on first deploy. No migration files to manage.

Your production database starts empty (no demo data) — add your real items in
**The Provision**, then import a day of sales. To load the demo catalog into a
Postgres database instead, run `npm run db:seed` with `DATABASE_URL` pointing at it.

> **Schema changes later:** `prisma db push` applies additive changes safely. If a
> change would drop data it fails the build (on purpose). For a formal migration
> history, adopt `prisma migrate` once you have a persistent Postgres dev database.

---

## Tech

Next.js (App Router) · Prisma · SQLite→Postgres · Recharts · Tailwind. Money is
computed in-app and rounded to cents; margins are only reported for lines whose
cost is known, so unknown costs never silently deflate the numbers.
