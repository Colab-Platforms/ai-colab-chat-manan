import prisma from "@root/prisma";
import { ApiError } from "@/utils/ApiError";
import STATUS_CODES from "@/utils/statusCodes";
import { CreatePlanBody, UpdatePlanBody } from "./plan.types.js";
import { getPaginationOptions, formatPaginationResponse } from "@/utils/paginationUtils";
import { buildPrismaQuery } from "prisma-qb";

class PlanService {
    async create(data: CreatePlanBody) {
        const plan = await prisma.plan.create({ data });
        return plan;
    }

    async list(query: any) {
        const { take, skip, page, pageSize } = getPaginationOptions(query, 10);

        const { where, orderBy } = buildPrismaQuery({
            query,
            searchFields: [
                { field: "name" },
            ],
            filterFields: [
                { key: "isActive", field: "isActive", type: "boolean" },
            ],
            sortFields: [
                { key: "name", field: "name" },
                { key: "monthlyPrice", field: "monthlyPrice" },
                { key: "tokenLimit", field: "tokenLimit" },
                { key: "createdAt", field: "createdAt" },
            ],
            defaultSort: { key: "createdAt", order: "desc" },
            softDelete: { field: "isDeleted", value: false },
            allowedQueryKeys: ["page", "pageSize"],
        });

        const [plans, totalRecords] = await Promise.all([
            prisma.plan.findMany({ where, skip, take, orderBy }),
            prisma.plan.count({ where }),
        ]);

        return formatPaginationResponse(plans, totalRecords, page, pageSize);
    }

    async getById(planId: number) {
        const plan = await prisma.plan.findFirst({
            where: { id: planId, isDeleted: false },
        });
        if (!plan) throw new ApiError("Plan not found", STATUS_CODES.NOT_FOUND);
        return plan;
    }

    async update(planId: number, data: UpdatePlanBody) {
        const plan = await prisma.plan.findFirst({
            where: { id: planId, isDeleted: false },
        });
        if (!plan) throw new ApiError("Plan not found", STATUS_CODES.NOT_FOUND);

        const updated = await prisma.plan.update({
            where: { id: planId },
            data,
        });
        return updated;
    }

    async softDelete(planId: number) {
        const plan = await prisma.plan.findFirst({
            where: { id: planId, isDeleted: false },
        });
        if (!plan) throw new ApiError("Plan not found", STATUS_CODES.NOT_FOUND);

        await prisma.plan.update({
            where: { id: planId },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        return { message: "Plan deleted successfully" };
    }
}

export default PlanService;
