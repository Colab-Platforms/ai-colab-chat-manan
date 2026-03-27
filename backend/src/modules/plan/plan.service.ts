import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { CreatePlanBody, UpdatePlanBody } from "./plan.types.js";
import { getPaginationOptions, formatPaginationResponse } from "@/utils/paginationUtils.js";
import { buildPrismaQuery } from "prisma-qb";
import SubscriptionCashfreeService from "@/modules/subscription/subscription.cashfree.service.js";

class PlanService {
    private cashfreeService = new SubscriptionCashfreeService();

    async create(data: CreatePlanBody) {
        const plan = await prisma.plan.create({ data });
        try {
            await this.cashfreeService.syncAllPlanCycles(plan as any);
            return plan;
        } catch (error) {
            await prisma.plan.delete({ where: { id: plan.id } });
            throw error;
        }
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

        try {
            await this.cashfreeService.syncAllPlanCycles(updated as any);
        } catch (error) {
            // Roll back local update if Cashfree sync fails.
            await prisma.plan.update({
                where: { id: planId },
                data: {
                    name: plan.name,
                    monthlyPrice: plan.monthlyPrice,
                    quarterlyPrice: plan.quarterlyPrice,
                    yearlyPrice: plan.yearlyPrice,
                    tokenLimit: plan.tokenLimit,
                    features: (plan.features ?? {}) as any,
                    isActive: plan.isActive,
                },
            });
            throw error;
        }

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
