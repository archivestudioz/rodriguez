// Picks the Prisma datasource provider from DATABASE_URL so the SAME schema
// works both ways with no manual editing:
//   file:...      -> sqlite   (local dev)
//   postgres://…  -> postgresql (Vercel + Neon)
//
// Runs before `prisma generate`, `prisma db push`, `dev`, and `build`.
// If DATABASE_URL is unset (e.g. a plain local shell), the schema is left as-is.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "schema.prisma");

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";
let target = null;
if (/^postgres(ql)?:\/\//i.test(url)) target = "postgresql";
else if (/^file:/i.test(url)) target = "sqlite";

if (!target) {
  console.log("[set-provider] DATABASE_URL not conclusive; leaving schema provider unchanged.");
  process.exit(0);
}

const schema = readFileSync(schemaPath, "utf8");
const next = schema.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"(sqlite|postgresql)"/s,
  `$1"${target}"`,
);

if (next !== schema) {
  writeFileSync(schemaPath, next);
  console.log(`[set-provider] datasource provider set to "${target}".`);
} else {
  console.log(`[set-provider] datasource provider already "${target}".`);
}
