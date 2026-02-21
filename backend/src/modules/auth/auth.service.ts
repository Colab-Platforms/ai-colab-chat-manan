import prisma from "@root/prisma.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import jwt from "jsonwebtoken";
import { hashPassword, comparePassword } from "@/utils/auth.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { RegisterBody, LoginBody, AdminLoginBody, userSelectFields } from "./auth.types.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const formatUser = (user: any) => ({
    ...user,
    createdAt: dayjs.utc(user.createdAt).tz(user.timezone).format("YYYY-MM-DDTHH:mm"),
    updatedAt: dayjs.utc(user.updatedAt).tz(user.timezone).format("YYYY-MM-DDTHH:mm"),
});

// Determine the highest-priority role for JWT
const getHighestRole = (roleNames: string[]): "USER" | "ADMIN" | "SUPERADMIN" => {
    if (roleNames.includes("SUPERADMIN") || roleNames.includes("SUPER_ADMIN")) return "SUPERADMIN";
    if (roleNames.includes("ADMIN")) return "ADMIN";
    return "USER";
};

class AuthService {
    async register(data: RegisterBody) {
        const existingUser = await prisma.user.findFirst({
            where: { email: data.email, isDeleted: false },
        });

        if (existingUser) {
            throw new ApiError("Email already registered", STATUS_CODES.CONFLICT);
        }

        const hashedPassword = await hashPassword(data.password);

        const roleRecord = await prisma.role.findUnique({ where: { name: "USER" } });
        if (!roleRecord) throw new ApiError("USER role not found", STATUS_CODES.SERVER_ERROR);

        // Find Free plan for auto-assignment
        const freePlan = await prisma.plan.findFirst({ where: { name: "Free" } });

        const user = await prisma.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
                data: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    password: hashedPassword,
                },
                select: userSelectFields,
            });

            await tx.userRole.create({
                data: {
                    userId: createdUser.id,
                    roleId: roleRecord.id,
                },
            });

            // Auto-assign Free plan subscription + wallet
            if (freePlan) {
                const now = new Date();
                const periodEnd = dayjs(now).add(1, "month").toDate();

                await tx.subscription.create({
                    data: {
                        userId: createdUser.id,
                        planId: freePlan.id,
                        status: "ACTIVE",
                        billingCycle: "MONTHLY",
                        startedAt: now,
                        expiresAt: periodEnd,
                        autoRenew: true,
                    },
                });

                await tx.userWallet.create({
                    data: {
                        userId: createdUser.id,
                        tokensRemaining: freePlan.tokenLimit,
                        tokensUsed: 0,
                        currentPeriodStart: now,
                        currentPeriodEnd: periodEnd,
                    },
                });
            }

            return await tx.user.findUnique({
                where: { id: createdUser.id },
                select: userSelectFields,
            });
        });

        return { user: formatUser(user) };
    }

    async login(data: LoginBody) {
        const user = await prisma.user.findFirst({
            where: { email: data.email, isDeleted: false },
            include: {
                userRoles: {
                    include: { role: true },
                },
            },
        });

        if (!user) {
            throw new ApiError("Invalid email or password", STATUS_CODES.UNAUTHORIZED);
        }

        const hasUserRole = user.userRoles.some((ur) => ur.role.name === "USER");
        if (!hasUserRole) {
            throw new ApiError("Access denied. You do not have user privileges", STATUS_CODES.FORBIDDEN);
        }

        const isPasswordValid = await comparePassword(data.password, user.password);
        if (!isPasswordValid) {
            throw new ApiError("Invalid email or password", STATUS_CODES.UNAUTHORIZED);
        }

        if (!process.env.JWT_SECRET) {
            throw new ApiError("JWT secret is not defined", STATUS_CODES.SERVER_ERROR);
        }

        // Use highest role so admins/superadmins get full access via single login
        const roleNames = user.userRoles.map((ur) => ur.role.name);
        const highestRole = getHighestRole(roleNames);

        const token = jwt.sign(
            {
                id: user.id,
                role: highestRole,
                timezone: user.timezone,
            },
            process.env.JWT_SECRET,
            { expiresIn: "90d" }
        );

        const { password: _, ...userWithoutPassword } = user;

        return { user: formatUser(userWithoutPassword), token };
    }

    async loginAdmin(data: AdminLoginBody) {
        const user = await prisma.user.findFirst({
            where: { email: data.email, isDeleted: false },
            include: {
                userRoles: {
                    include: { role: true },
                },
            },
        });

        if (!user) {
            throw new ApiError("Invalid email or password", STATUS_CODES.UNAUTHORIZED);
        }

        const roleNames = user.userRoles.map((ur) => ur.role.name);
        const highestRole = getHighestRole(roleNames);

        if (highestRole === "USER") {
            throw new ApiError("Access denied. You do not have admin privileges", STATUS_CODES.FORBIDDEN);
        }

        const isPasswordValid = await comparePassword(data.password, user.password);
        if (!isPasswordValid) {
            throw new ApiError("Invalid email or password", STATUS_CODES.UNAUTHORIZED);
        }

        if (!process.env.JWT_SECRET) {
            throw new ApiError("JWT secret is not defined", STATUS_CODES.SERVER_ERROR);
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: highestRole,
                timezone: user.timezone,
            },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        const { password: _, ...userWithoutPassword } = user;

        return { user: formatUser(userWithoutPassword), token };
    }
}

export default AuthService;