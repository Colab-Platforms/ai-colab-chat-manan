import cron from "node-cron";
import prisma from "@root/prisma.js";
import dayjs from "dayjs";
import { createWalletTransaction } from "@/utils/walletUtils.js";

// Subscription expiry check — runs daily at midnight
const task = () => {
    cron.schedule("0 0 * * *", async () => {
        console.log("🔄 Running subscription expiry check...");

        try {
            const expiredSubscriptions = await prisma.subscription.findMany({
                where: {
                    status: { in: ["ACTIVE", "CANCELLED"] },
                    expiresAt: { lt: new Date() },
                },
                include: { plan: true },
            });

            for (const sub of expiredSubscriptions) {
                if (sub.autoRenew) {
                    let newExpiresAt: Date;
                    switch (sub.billingCycle) {
                        case "MONTHLY":
                            newExpiresAt = dayjs(sub.expiresAt).add(1, "month").toDate();
                            break;
                        case "QUARTERLY":
                            newExpiresAt = dayjs(sub.expiresAt).add(3, "month").toDate();
                            break;
                        case "YEARLY":
                            newExpiresAt = dayjs(sub.expiresAt).add(1, "year").toDate();
                            break;
                    }

                    await prisma.subscription.update({
                        where: { id: sub.id },
                        data: { expiresAt: newExpiresAt },
                    });

                    console.log(`  🔄 Auto-renewed subscription ${sub.id}`);
                } else {
                    await prisma.$transaction(async (tx) => {
                        await tx.subscription.update({
                            where: { id: sub.id },
                            data: { status: "EXPIRED" },
                        });

                        const wallet = await tx.userWallet.findUnique({
                            where: { userId: sub.userId },
                        });

                        if (wallet && wallet.tokensRemaining > 0) {
                            const unusedTokens = wallet.tokensRemaining;
                            await tx.userWallet.update({
                                where: { id: wallet.id },
                                data: { tokensRemaining: 0 },
                            });

                            await createWalletTransaction(tx, {
                                userId: sub.userId,
                                walletId: wallet.id,
                                amount: unusedTokens,
                                type: "DEBIT",
                                referenceId: `exp_${sub.id}`,
                                meta: { reason: "SUBSCRIPTION_EXPIRED", planId: sub.planId },
                            });
                        }
                    });

                    console.log(`  ⏰ Expired subscription ${sub.id} and cleared remaining tokens.`);
                }
            }

            console.log(`✅ Subscription expiry check completed. Processed ${expiredSubscriptions.length}`);
        } catch (error) {
            console.error("❌ Subscription expiry cron error:", error);
        }
    });
};

export default task;
