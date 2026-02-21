import prisma from "@root/prisma";
import { ApiError } from "@/utils/ApiError";
import STATUS_CODES from "@/utils/statusCodes";
import { CreateModelProviderBody, UpdateModelProviderBody } from "./modelProvider.types";
import { getPaginationOptions, formatPaginationResponse } from "@/utils/paginationUtils";
import { buildPrismaQuery } from "prisma-qb";

class ModelProviderService {
    async create(data: CreateModelProviderBody) {
        const provider = await prisma.modelProvider.create({ data });
        return provider;
    }

    async list(query: any) {
        const { take, skip, page, pageSize } = getPaginationOptions(query, 10);

        const { where, orderBy } = buildPrismaQuery({
            query,
            searchFields: [
                { field: "name" },
                { field: "description" },
            ],
            filterFields: [
                { key: "isActive", field: "isActive", type: "boolean" },
            ],
            sortFields: [
                { key: "name", field: "name" },
                { key: "createdAt", field: "createdAt" },
            ],
            defaultSort: { key: "createdAt", order: "desc" },
            softDelete: { field: "isDeleted", value: false },
            allowedQueryKeys: ["page", "pageSize"],
        });

        const [providers, totalRecords] = await Promise.all([
            prisma.modelProvider.findMany({ where, skip, take, orderBy }),
            prisma.modelProvider.count({ where }),
        ]);

        return formatPaginationResponse(providers, totalRecords, page, pageSize);
    }

    async getById(providerId: number) {
        const provider = await prisma.modelProvider.findFirst({
            where: { id: providerId, isDeleted: false },
            include: { models: { where: { isDeleted: false } } },
        });
        if (!provider) throw new ApiError("Model provider not found", STATUS_CODES.NOT_FOUND);
        return provider;
    }

    async update(providerId: number, data: UpdateModelProviderBody) {
        const provider = await prisma.modelProvider.findFirst({
            where: { id: providerId, isDeleted: false },
        });
        if (!provider) throw new ApiError("Model provider not found", STATUS_CODES.NOT_FOUND);

        const updated = await prisma.modelProvider.update({
            where: { id: providerId },
            data,
        });
        return updated;
    }

    async softDelete(providerId: number) {
        const provider = await prisma.modelProvider.findFirst({
            where: { id: providerId, isDeleted: false },
        });
        if (!provider) throw new ApiError("Model provider not found", STATUS_CODES.NOT_FOUND);

        await prisma.modelProvider.update({
            where: { id: providerId },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        return { message: "Model provider deleted successfully" };
    }
}

export default ModelProviderService;
