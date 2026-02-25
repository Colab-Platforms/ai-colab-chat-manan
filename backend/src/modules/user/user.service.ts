import prisma from "@root/prisma.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { userProfileSelectFields, UpdateProfileBody } from "./user.types.js";
import { getPaginationOptions, formatPaginationResponse } from "@/utils/paginationUtils.js";
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
                phoneNumber: data.phoneNumber?.trim() || null,
                ...(data.profileImage && { profileImage: data.profileImage }),
            },
            select: userProfileSelectFields,
        });

        return formatUser(updatedUser);
    }

    async listUsers(query: any, callerRole: string, callerId: number) {
        const { take, skip, page, pageSize } = getPaginationOptions(query, 10);

        const { where: qbWhere, orderBy } = buildPrismaQuery({
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

        // Determine which roles the caller can see
        const visibleRoles = callerRole === "SUPERADMIN"
            ? ["USER", "ADMIN"]
            : ["USER"]; // ADMIN can only see USER-role users

        const where = {
            ...qbWhere,
            id: { not: callerId }, // exclude self
            userRoles: {
                some: {
                    role: { name: { in: visibleRoles } },
                },
                none: {
                    role: { name: { in: ["SUPERADMIN", "SUPER_ADMIN"] } },
                },
            },
        };

        const [users, totalRecords] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    ...userProfileSelectFields,
                    subscriptions: {
                        where: { status: { in: ["ACTIVE", "TRIAL"] } },
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        include: { plan: { select: { id: true, name: true } } },
                    },
                },
                skip,
                take,
                orderBy,
            }),
            prisma.user.count({ where }),
        ]);

        const formattedUsers = users.map(formatUser);
        return formatPaginationResponse(formattedUsers, totalRecords, page, pageSize);
    }

    async adminUpdateUser(userId: number, data: any, callerRole: string) {
        const user = await prisma.user.findFirst({
            where: { id: userId, isDeleted: false },
            include: { userRoles: { include: { role: true } } },
        });

        if (!user) {
            throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);
        }

        // Prevent editing SUPERADMIN users
        const isSuperAdmin = user.userRoles.some((ur) => ur.role.name === "SUPERADMIN" || ur.role.name === "SUPER_ADMIN");
        if (isSuperAdmin) {
            throw new ApiError("Cannot modify a SUPERADMIN account", STATUS_CODES.FORBIDDEN);
        }

        // Update basic profile fields
        await prisma.user.update({
            where: { id: userId },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                phoneNumber: data.phoneNumber,
                isActive: data.isActive,
            },
        });

        // Sync roles if provided and caller is SUPERADMIN
        if (data.roles && Array.isArray(data.roles) && callerRole === "SUPERADMIN") {
            // Filter out SUPERADMIN from the input — it can never be assigned
            const requestedRoles: string[] = data.roles.filter((r: string) => r !== "SUPERADMIN" && r !== "SUPER_ADMIN");

            // Ensure USER role is always present
            if (!requestedRoles.includes("USER")) {
                requestedRoles.push("USER");
            }

            // Get all role records
            const allRoles = await prisma.role.findMany({
                where: { name: { in: requestedRoles } },
            });

            const roleIds = allRoles.map((r) => r.id);

            // Remove existing non-SUPERADMIN roles
            await prisma.userRole.deleteMany({
                where: {
                    userId,
                    role: { name: { notIn: ["SUPERADMIN", "SUPER_ADMIN"] } },
                },
            });

            // Re-create with requested roles
            await prisma.userRole.createMany({
                data: roleIds.map((roleId) => ({ userId, roleId })),
                skipDuplicates: true,
            });
        }

        // Return fresh user with updated roles
        const freshUser = await prisma.user.findFirst({
            where: { id: userId },
            select: userProfileSelectFields,
        });

        return formatUser(freshUser);
    }

    async softDelete(userId: number) {
        const user = await prisma.user.findFirst({
            where: { id: userId, isDeleted: false },
            include: { userRoles: { include: { role: true } } },
        });

        if (!user) {
            throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);
        }

        // Prevent deletion of SUPERADMIN
        const isSuperAdmin = user.userRoles.some((ur) => ur.role.name === "SUPERADMIN" || ur.role.name === "SUPER_ADMIN");
        if (isSuperAdmin) {
            throw new ApiError("SUPERADMIN account cannot be deleted", STATUS_CODES.FORBIDDEN);
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        return { message: "User deleted successfully" };
    }

    async getUserUsage(userId: number, query: any) {
        const { take, skip, page, pageSize } = getPaginationOptions(query, 10);

        // Token summary
        const summary = await prisma.usageLog.aggregate({
            where: { userId },
            _sum: { promptTokens: true, completionTokens: true, totalTokens: true },
            _count: true,
        });

        // Paginated usage logs
        const [logs, totalRecords] = await Promise.all([
            prisma.usageLog.findMany({
                where: { userId },
                skip,
                take,
                orderBy: { createdAt: "desc" },
                include: {
                    model: { select: { id: true, name: true } },
                },
            }),
            prisma.usageLog.count({ where: { userId } }),
        ]);

        return {
            summary: {
                totalPromptTokens: summary._sum.promptTokens || 0,
                totalCompletionTokens: summary._sum.completionTokens || 0,
                totalTokens: summary._sum.totalTokens || 0,
                totalPrompts: summary._count || 0,
            },
            usage: formatPaginationResponse(logs, totalRecords, page, pageSize),
        };
    }

    async getUserSubscription(userId: number) {
        const subscription = await prisma.subscription.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
            include: { plan: true },
        });

        return subscription;
    }
}

export default UserService;
