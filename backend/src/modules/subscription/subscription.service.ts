import prisma from "@root/prisma.js";
import dayjs from "dayjs";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { CreateSubscriptionBody } from "./subscription.types.js";
import { createWalletTransaction } from "@/utils/walletUtils.js";

class SubscriptionService {
    async create(userId: number, data: CreateSubscriptionBody) {
        const plan = await prisma.plan.findFirst({
            where: { id: data.planId, isActive: true, isDeleted: false },
        });

        if (!plan) {
            throw new ApiError("Plan not found", STATUS_CODES.NOT_FOUND);
        }

        const existingSub = await prisma.subscription.findFirst({
            where: { userId, status: "ACTIVE" },
        });

        if (existingSub) {
            throw new ApiError("You already have an active subscription", STATUS_CODES.CONFLICT);
        }

        const now = new Date();
        let expiresAt: Date;

        switch (data.billingCycle) {
            case "MONTHLY":
                expiresAt = dayjs(now).add(1, "month").toDate();
                break;
            case "QUARTERLY":
                expiresAt = dayjs(now).add(3, "month").toDate();
                break;
            case "YEARLY":
                expiresAt = dayjs(now).add(1, "year").toDate();
                break;
        }

        const result = await prisma.$transaction(async (tx) => {
            const subscription = await tx.subscription.create({
                data: {
                    userId,
                    planId: data.planId,
                    billingCycle: data.billingCycle,
                    status: "ACTIVE",
                    autoRenew: true,
                    startedAt: now,
                    expiresAt,
                },
            });

            const wallet = await tx.userWallet.upsert({
                where: { userId },
                create: {
                    userId,
                    tokensRemaining: plan.tokenLimit,
                    tokensUsed: 0,
                    currentPeriodStart: now,
                    currentPeriodEnd: dayjs(now).add(1, "month").toDate(),
                },
                update: {
                    tokensRemaining: plan.tokenLimit,
                    tokensUsed: 0,
                    currentPeriodStart: now,
                    currentPeriodEnd: dayjs(now).add(1, "month").toDate(),
                },
            });

            await createWalletTransaction(tx, {
                userId,
                walletId: wallet.id,
                amount: plan.tokenLimit,
                type: "CREDIT",
                referenceId: `sub_${subscription.id}`,
                meta: { reason: "SUBSCRIPTION_CREATION", planId: plan.id, planName: plan.name },
            });

            return subscription;
        });

        return result;
    }

    async getCurrent(userId: number) {
        const subscription = await prisma.subscription.findFirst({
            where: { userId, status: { in: ["ACTIVE", "TRIAL"] } },
            include: { plan: true },
            orderBy: { createdAt: "desc" },
        });

        if (!subscription) {
            throw new ApiError("No active subscription found", STATUS_CODES.NOT_FOUND);
        }

        return subscription;
    }

    async cancel(userId: number) {
        const subscription = await prisma.subscription.findFirst({
            where: { userId, status: "ACTIVE" },
        });

        if (!subscription) {
            throw new ApiError("No active subscription found", STATUS_CODES.NOT_FOUND);
        }

        const updated = await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "CANCELLED", autoRenew: false },
        });

        return updated;
    }
}

export default SubscriptionService;
