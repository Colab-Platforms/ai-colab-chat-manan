import prisma from "@root/prisma.js";
import { Prisma } from "@prisma/client";
import {
  getPaginationOptions,
  formatPaginationResponse,
} from "@/utils/paginationUtils.js";
import { buildPrismaQuery } from "prisma-qb";

class UsageLogService {
  async list(query: any, callerRole: string = "USER") {
    const { take, skip, page, pageSize } = getPaginationOptions(query, 10);

    const { where: qbWhere, orderBy } = buildPrismaQuery({
      query,
      searchFields: [
        { field: "firstName", model: "user" },
        { field: "lastName", model: "user" },
        { field: "email", model: "user" },
      ],
      filterFields: [
        { key: "userId", field: "userId", type: "number" },
        { key: "modelId", field: "modelId", type: "number" },
        { key: "chatId", field: "chatId", type: "number" },
        { key: "createdAt", field: "createdAt", type: "date" },
      ],
      sortFields: [
        { key: "createdAt", field: "createdAt" },
        { key: "totalTokens", field: "totalTokens" },
        { key: "promptTokens", field: "promptTokens" },
        { key: "completionTokens", field: "completionTokens" },
      ],
      defaultSort: { key: "createdAt", order: "desc" },
      allowedQueryKeys: ["page", "pageSize"],
    });

    const where: any = { ...qbWhere };

    // Hide SuperAdmin logs from standard Admins and Users
    if (callerRole !== "SUPERADMIN" && callerRole !== "SUPER_ADMIN") {
      where.user = {
        userRoles: {
          none: {
            role: { name: { in: ["SUPERADMIN", "SUPER_ADMIN"] } },
          },
        },
      };
    }

    const [logs, totalRecords] = await Promise.all([
      prisma.usageLog.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          model: { select: { id: true, name: true } },
        },
      }),
      prisma.usageLog.count({ where }),
    ]);

    return formatPaginationResponse(logs, totalRecords, page, pageSize);
  }

  /** Total tokens logged per calendar day (UTC) per model, for charts. */
  async getDailyTokensByModel(userId: number, days: number) {
    const safeDays = Math.min(Math.max(Math.floor(days), 1), 90);
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - (safeDays - 1));

    const rows = await prisma.$queryRaw<
      Array<{
        day: Date;
        modelId: number;
        modelName: string;
        tokens: bigint;
      }>
    >(Prisma.sql`
      SELECT
        (ul."createdAt" AT TIME ZONE 'UTC')::date AS day,
        ul."modelId",
        m.name AS "modelName",
        COALESCE(SUM(ul."totalTokens"), 0)::bigint AS tokens
      FROM "UsageLog" ul
      INNER JOIN "Model" m ON m.id = ul."modelId"
      WHERE ul."userId" = ${userId}
        AND ul."createdAt" >= ${from}
      GROUP BY (ul."createdAt" AT TIME ZONE 'UTC')::date, ul."modelId", m.name
      ORDER BY day ASC, m.name ASC
    `);

    return rows.map((r) => {
      const day =
        r.day instanceof Date
          ? r.day.toISOString().slice(0, 10)
          : String(r.day).slice(0, 10);
      return {
        day,
        modelId: r.modelId,
        modelName: r.modelName,
        tokens: Number(r.tokens),
      };
    });
  }
}

export default UsageLogService;
