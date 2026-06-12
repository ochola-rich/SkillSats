import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("[DB] Warning: DATABASE_URL is not set in environment variables.");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  pool: pg.Pool;
};

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter, log: ["error"] });
} else {
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new pg.Pool({ connectionString });
  }
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg(globalForPrisma.pool);
    globalForPrisma.prisma = new PrismaClient({ adapter, log: ["error"] });
  }
  prisma = globalForPrisma.prisma;
}

export const db = prisma;
