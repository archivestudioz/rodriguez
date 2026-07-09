import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Resolve the connection string from whatever the platform exposes. Vercel
// storage integrations name it differently (Neon → DATABASE_URL; Vercel
// Postgres → POSTGRES_PRISMA_URL / POSTGRES_URL). Runtime uses the pooled URL.
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  undefined;

const log =
  process.env.NODE_ENV === "development"
    ? (["error", "warn"] as const)
    : (["error"] as const);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    url ? { datasources: { db: { url } }, log: [...log] } : { log: [...log] },
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
