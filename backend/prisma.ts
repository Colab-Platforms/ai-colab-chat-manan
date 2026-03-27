import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const poolMax = Number(process.env.DB_POOL_MAX ?? 20);
const poolIdleTimeoutMs = Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30_000);
const poolConnectionTimeoutMs = Number(
  process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? 10_000,
);

const adapter = new PrismaPg({
  connectionString: databaseUrl,
  max: Number.isFinite(poolMax) ? poolMax : 20,
  idleTimeoutMillis: Number.isFinite(poolIdleTimeoutMs)
    ? poolIdleTimeoutMs
    : 30_000,
  connectionTimeoutMillis: Number.isFinite(poolConnectionTimeoutMs)
    ? poolConnectionTimeoutMs
    : 10_000,
});

if (
  process.env.NODE_ENV === "production" &&
  !/(pooler|pgbouncer|proxy)/i.test(databaseUrl)
) {
  console.warn(
    "[DB] Production DATABASE_URL does not look like a pooled endpoint. Consider PgBouncer or a managed pooler.",
  );
}

export const prisma = new PrismaClient({ adapter });

export default prisma