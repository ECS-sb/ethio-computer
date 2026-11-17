import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // DATABASE_URL በNeon የpooler አድራሻ ነው፤ Vercel ሲያቆም ግንኙነቶቹ በትክክል እንዲዘጉ ይያያዛል።
  // Neon ሲተኛ (scale-to-zero) ያረጁ ግንኙነቶችን ይዘጋል፤ የቆዩትን ቶሎ ጥሎ አዲስ ይከፍታል፣
  // የተቋረጠ ግንኙነትም ሂደቱን አያቆምም ("Connection terminated unexpectedly")።
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 15_000 });
  pool.on("error", (error) => console.warn("db pool:", error.message));
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
