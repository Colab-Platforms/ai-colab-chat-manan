import cron from "node-cron";
import prisma from "@root/prisma.js";
import dayjs from "dayjs";

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
                await prisma.userWallet.update({
                    where: { userId: sub.userId },
                    data: {
                        tokensRemaining: sub.plan.tokenLimit,
                        tokensUsed: 0,
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: dayjs().add(1, "month").toDate(),
                    },
                });
            }

            console.log(`✅ Token reset completed for ${activeSubscriptions.length} subscriptions`);
        } catch (error) {
            console.error("❌ Token reset cron error:", error);
        }
    });
};

export default task;
