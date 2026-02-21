import prisma from "@root/prisma";
import { ApiError } from "@/utils/ApiError";
import STATUS_CODES from "@/utils/statusCodes";
import { CreateModelBody, UpdateModelBody } from "./model.types";
import { getPaginationOptions, formatPaginationResponse } from "@/utils/paginationUtils";
import { buildPrismaQuery } from "prisma-qb";

class ModelService {
    async create(data: CreateModelBody) {
        const provider = await prisma.modelProvider.findFirst({
            where: { id: data.modelProviderId, isDeleted: false },
        });
        if (!provider) throw new ApiError("Model provider not found", STATUS_CODES.NOT_FOUND);

        const model = await prisma.model.create({
            data,
            include: { modelProvider: { select: { id: true, name: true } } },
        });

        return model;
    }

    async list(query: any) {
        const { take, skip, page, pageSize } = getPaginationOptions(query, 10);

        const { where, orderBy } = buildPrismaQuery({
            query,
            searchFields: [
                { field: "name" },
                { field: "externalId" },
            ],
            filterFields: [
                { key: "isActive", field: "isActive", type: "boolean" },
                { key: "modelProviderId", field: "modelProviderId", type: "number" },
            ],
            sortFields: [
                { key: "name", field: "name" },
                { key: "createdAt", field: "createdAt" },
                { key: "isActive", field: "isActive" },
            ],
            defaultSort: { key: "createdAt", order: "desc" },
            softDelete: { field: "isDeleted", value: false },
            allowedQueryKeys: ["page", "pageSize"],
        });

        const [models, totalRecords] = await Promise.all([
            prisma.model.findMany({
                where,
                skip,
                take,
                orderBy,
                include: { modelProvider: { select: { id: true, name: true } } },
            }),
            prisma.model.count({ where }),
        ]);

        return formatPaginationResponse(models, totalRecords, page, pageSize);
    }

    async getById(modelId: number) {
        const model = await prisma.model.findFirst({
            where: { id: modelId, isDeleted: false },
            include: { modelProvider: { select: { id: true, name: true } } },
        });
        if (!model) throw new ApiError("Model not found", STATUS_CODES.NOT_FOUND);
        return model;
    }

    async update(modelId: number, data: UpdateModelBody) {
        const model = await prisma.model.findFirst({
            where: { id: modelId, isDeleted: false },
        });
        if (!model) throw new ApiError("Model not found", STATUS_CODES.NOT_FOUND);

        const updated = await prisma.model.update({
            where: { id: modelId },
            data,
            include: { modelProvider: { select: { id: true, name: true } } },
        });
        return updated;
    }

    async softDelete(modelId: number) {
        const model = await prisma.model.findFirst({
            where: { id: modelId, isDeleted: false },
        });
        if (!model) throw new ApiError("Model not found", STATUS_CODES.NOT_FOUND);

        await prisma.model.update({
            where: { id: modelId },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        return { message: "Model deleted successfully" };
    }
}

export default ModelService;
