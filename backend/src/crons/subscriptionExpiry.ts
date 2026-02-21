import cron from "node-cron";
import prisma from "@root/prisma";
import dayjs from "dayjs";

// Subscription expiry check — runs daily at midnight
const task = () => {
    cron.schedule("0 0 * * *", async () => {
        console.log("🔄 Running subscription expiry check...");

        try {
            const expiredSubscriptions = await prisma.subscription.findMany({
                where: {
                    status: "ACTIVE",
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
                    await prisma.subscription.update({
                        where: { id: sub.id },
                        data: { status: "EXPIRED" },
                    });

                    console.log(`  ⏰ Expired subscription ${sub.id}`);
                }
            }

            console.log(`✅ Subscription expiry check completed. Processed ${expiredSubscriptions.length}`);
        } catch (error) {
            console.error("❌ Subscription expiry cron error:", error);
        }
    });
};

export default task;
