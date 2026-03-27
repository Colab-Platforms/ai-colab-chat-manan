import cron from "node-cron";
import prisma from "@root/prisma.js";
import dayjs from "dayjs";
import { createWalletTransaction } from "@/utils/walletUtils.js";

const task = () => {
    cron.schedule("0 0 * * *", async () => {
        console.log("🔄 Running subscription grace-period expiry check...");

        try {
            const pastDueSubscriptions = await prisma.subscription.findMany({
                where: {
                    status: "PAST_DUE",
                    nextBillingDate: { not: null },
                },
                include: { plan: true },
            });

            for (const sub of pastDueSubscriptions) {
                if (!sub.nextBillingDate) continue;

                const graceExpiry = dayjs(sub.nextBillingDate).add(3, "day");
                const now = dayjs();

                if (now.isAfter(graceExpiry)) {
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
                                referenceId: `subscription_grace_expired_${sub.id}`,
                                meta: {
                                    reason: "SUBSCRIPTION_GRACE_PERIOD_EXPIRED",
                                    planId: sub.planId,
                                },
                            });
                        }
                    });

                    console.log(`  ⏰ Expired subscription ${sub.id} after grace period.`);
                }
            }

            console.log(`✅ Subscription grace-period check completed. Processed ${pastDueSubscriptions.length}`);
        } catch (error) {
            console.error("❌ Subscription grace-period cron error:", error);
        }
    });
};

export default task;
