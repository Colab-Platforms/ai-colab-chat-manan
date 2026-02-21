import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { CreateFolderBody, UpdateFolderBody } from "./folder.types.js";
import { getPaginationOptions, formatPaginationResponse } from "@/utils/paginationUtils.js";

class FolderService {
    async create(userId: number, data: CreateFolderBody) {
        const folder = await prisma.folder.create({
            data: { name: data.name, userId },
        });

        return folder;
    }

    async list(userId: number, query: any) {
        const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

        const where = { userId, isDeleted: false };

        const [folders, totalRecords] = await Promise.all([
            prisma.folder.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: "desc" },
            }),
            prisma.folder.count({ where }),
        ]);

        return formatPaginationResponse(folders, totalRecords, page, pageSize);
    }

    async update(userId: number, folderId: number, data: UpdateFolderBody) {
        const folder = await prisma.folder.findFirst({
            where: { id: folderId, userId, isDeleted: false },
        });

        if (!folder) {
            throw new ApiError("Folder not found", STATUS_CODES.NOT_FOUND);
        }

        const updatedFolder = await prisma.folder.update({
            where: { id: folderId },
            data: { name: data.name },
        });

        return updatedFolder;
    }

    async softDelete(userId: number, folderId: number) {
        const folder = await prisma.folder.findFirst({
            where: { id: folderId, userId, isDeleted: false },
        });

        if (!folder) {
            throw new ApiError("Folder not found", STATUS_CODES.NOT_FOUND);
        }

        await prisma.folder.update({
            where: { id: folderId },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        return { message: "Folder deleted successfully" };
    }
}

export default FolderService;
