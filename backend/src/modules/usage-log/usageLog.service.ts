import prisma from "@root/prisma.js";
import { getPaginationOptions, formatPaginationResponse } from "@/utils/paginationUtils.js";
import { buildPrismaQuery } from "prisma-qb";

class UsageLogService {
    async list(query: any) {
        const { take, skip, page, pageSize } = getPaginationOptions(query, 10);

        const { where, orderBy } = buildPrismaQuery({
            query,
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

        const [logs, totalRecords] = await Promise.all([
            prisma.usageLog.findMany({
                where,
                skip,
                take,
                orderBy,
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                    model: { select: { id: true, name: true } },
                },
            }),
            prisma.usageLog.count({ where }),
        ]);

        return formatPaginationResponse(logs, totalRecords, page, pageSize);
    }
}

export default UsageLogService;
