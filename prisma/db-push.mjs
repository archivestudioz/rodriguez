// Applies the schema to the database during build (`prisma db push`).
//
// Two things this handles that a bare `prisma db push` does not:
//   1. Connection-string variety — different Vercel storage integrations expose
//      the URL under different names (DATABASE_URL, POSTGRES_PRISMA_URL, …).
//   2. Pooling — Neon's pooled URL (PgBouncer) can't run schema DDL reliably, so
//      we prefer a direct/unpooled URL for the push when one is available.

import { execSync } from "node:child_process";
import { join } from "node:path";

// Ensure the locally-installed `prisma` binary resolves even when this script
// is invoked outside npm's PATH.
const binDir = join(process.cwd(), "node_modules", ".bin");
const PATH = `${binDir}:${process.env.PATH ?? ""}`;

const pooled =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  "";

const direct =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  pooled;

function push(extraEnv) {
  execSync("prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, PATH, ...extraEnv },
  });
}

// No DATABASE_URL in the process env (e.g. local build reading from .env):
// let prisma run normally so it loads .env itself (SQLite dev).
if (!pooled) {
  try {
    push();
    process.exit(0);
  } catch {
    console.error(
      "\n[db-push] Could not apply the schema. If this is a Vercel build, add a\n" +
        "Postgres database (Project → Storage → Create Database → Neon) and redeploy.\n",
    );
    process.exit(1);
  }
}

// A real DB is configured — push using the direct connection for DDL safety.
push({ DATABASE_URL: direct });
