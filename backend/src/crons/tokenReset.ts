import cron from "node-cron";
import prisma from "@root/prisma.js";
import dayjs from "dayjs";
import { createWalletTransaction } from "@/utils/walletUtils.js";

// Monthly token reset — runs at midnight on the 1st of every month
const task = () => {
    cron.schedule("0 0 1 * *", async () => {
        console.log("🔄 Running monthly token reset...");

        try {
            const activeSubscriptions = await prisma.subscription.findMany({
                where: { status: "ACTIVE" },
                include: { plan: true },
            });

            for (const sub of activeSubscriptions) {
                await prisma.$transaction(async (tx) => {
                    const wallet = await tx.userWallet.update({
                        where: { userId: sub.userId },
                        data: {
                            tokensRemaining: sub.plan.tokenLimit,
                            tokensUsed: 0,
                            currentPeriodStart: new Date(),
                            currentPeriodEnd: dayjs().add(1, "month").toDate(),
                        },
                    });

                    await createWalletTransaction(tx, {
                        userId: sub.userId,
                        walletId: wallet.id,
                        amount: sub.plan.tokenLimit,
                        type: "CREDIT",
                        meta: { reason: "MONTHLY_TOKEN_RESET", planId: sub.planId },
                    });
                });
            }

            console.log(`✅ Token reset completed for ${activeSubscriptions.length} subscriptions`);
        } catch (error) {
            console.error("❌ Token reset cron error:", error);
        }
    });
};

export default task;
