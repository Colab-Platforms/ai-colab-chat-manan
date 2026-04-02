import cron from "node-cron";
import prisma from "@root/prisma.js";
import { createWalletTransaction } from "@/utils/walletUtils.js";

const task = () => {
  // Daily at 00:30
  cron.schedule("30 0 * * *", async () => {
    console.log("🔄 Running manual subscription expiry check...");

    try {
      const now = new Date();
      const expiringManualSubscriptions = await prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          autoRenew: false,
          expiresAt: { not: null, lte: now },
        },
        include: { plan: true },
      });

      for (const sub of expiringManualSubscriptions) {
        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: sub.id },
            data: { status: "EXPIRED", autoRenew: false },
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
              referenceId: `manual_subscription_expired_${sub.id}`,
              meta: {
                reason: "MANUAL_SUBSCRIPTION_EXPIRED",
                planId: sub.planId,
              },
            });
          }
        });
      }

      console.log(`✅ Manual subscription expiry check completed. Processed ${expiringManualSubscriptions.length}`);
    } catch (error) {
      console.error("❌ Manual subscription expiry cron error:", error);
    }
  });
};

export default task;

