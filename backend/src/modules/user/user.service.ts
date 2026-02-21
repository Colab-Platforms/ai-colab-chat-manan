import prisma from "@root/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { ApiError } from "@/utils/ApiError";
import STATUS_CODES from "@/utils/statusCodes";
import { userProfileSelectFields, UpdateProfileBody } from "./user.types";
import { getPaginationOptions, formatPaginationResponse } from "@/utils/paginationUtils";
import { buildPrismaQuery } from "prisma-qb";

dayjs.extend(utc);
dayjs.extend(timezone);

const formatUser = (user: any) => ({
    ...user,
    createdAt: dayjs.utc(user.createdAt).tz(user.timezone).format("YYYY-MM-DDTHH:mm"),
    updatedAt: dayjs.utc(user.updatedAt).tz(user.timezone).format("YYYY-MM-DDTHH:mm"),
});

class UserService {
    async getProfile(userId: number) {
        const user = await prisma.user.findFirst({
            where: { id: userId, isDeleted: false },
            select: userProfileSelectFields,
        });

        if (!user) {
            throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);
        }

        return formatUser(user);
    }

    async updateProfile(userId: number, data: UpdateProfileBody) {
        const user = await prisma.user.findFirst({
            where: { id: userId, isDeleted: false },
        });

        if (!user) {
            throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                phoneNumber: data.phoneNumber,
            },
            select: userProfileSelectFields,
        });

        return formatUser(updatedUser);
    }

    async listUsers(query: any) {
        const { take, skip, page, pageSize } = getPaginationOptions(query, 10);

        const { where, orderBy } = buildPrismaQuery({
            query,
            searchFields: [
                { field: "firstName" },
                { field: "lastName" },
                { field: "email" },
            ],
            filterFields: [
                { key: "isActive", field: "isActive", type: "boolean" },
                { key: "isVerified", field: "isVerified", type: "boolean" },
            ],
            sortFields: [
                { key: "createdAt", field: "createdAt" },
                { key: "firstName", field: "firstName" },
                { key: "email", field: "email" },
            ],
            defaultSort: { key: "createdAt", order: "desc" },
            softDelete: { field: "isDeleted", value: false },
            allowedQueryKeys: ["page", "pageSize"],
        });

        const [users, totalRecords] = await Promise.all([
            prisma.user.findMany({
                where,
                select: userProfileSelectFields,
                skip,
                take,
                orderBy,
            }),
            prisma.user.count({ where }),
        ]);

        const formattedUsers = users.map(formatUser);
        return formatPaginationResponse(formattedUsers, totalRecords, page, pageSize);
    }

    async adminUpdateUser(userId: number, data: any) {
        const user = await prisma.user.findFirst({
            where: { id: userId, isDeleted: false },
        });

        if (!user) {
            throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                phoneNumber: data.phoneNumber,
                isActive: data.isActive,
            },
            select: userProfileSelectFields,
        });

        return formatUser(updatedUser);
    }

    async softDelete(userId: number) {
        const user = await prisma.user.findFirst({
            where: { id: userId, isDeleted: false },
        });

        if (!user) {
            throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        return { message: "User deleted successfully" };
    }

    async makeAdmin(userId: number) {
        const user = await prisma.user.findFirst({
            where: { id: userId, isDeleted: false },
            include: { userRoles: { include: { role: true } } },
        });

        if (!user) {
            throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);
        }

        const hasAdminRole = user.userRoles.some((ur) => ur.role.name === "ADMIN");
        if (hasAdminRole) {
            throw new ApiError("User is already an ADMIN", STATUS_CODES.CONFLICT);
        }

        const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
        if (!adminRole) {
            throw new ApiError("ADMIN role not found", STATUS_CODES.SERVER_ERROR);
        }

        await prisma.userRole.create({
            data: { userId, roleId: adminRole.id },
        });

        return { message: "User promoted to ADMIN successfully" };
    }
}

export default UserService;
