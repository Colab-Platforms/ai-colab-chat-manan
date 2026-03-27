import prisma from "@root/prisma";
import SubscriptionCashfreeService from "@/modules/subscription/subscription.cashfree.service.js";

const PLANS = [
    {
        name: "Free",
        monthlyPrice: 0,
        quarterlyPrice: 0,
        yearlyPrice: 0,
        tokenLimit: 50000,
        features: {
            maxModels: -1,
            attachments: true,
            support: "community",
        },
    },
    {
        name: "Pro",
        monthlyPrice: 1499,
        quarterlyPrice: 4497,
        yearlyPrice: 17988,
        tokenLimit: 1000000,
        features: {
            maxModels: -1,
            attachments: true,
            support: "priority",
        },
    },
    {
        name: "Pro Plus",
        monthlyPrice: 2799,
        quarterlyPrice: 8397,
        yearlyPrice: 33588,
        tokenLimit: 2000000,
        features: {
            maxModels: -1,
            attachments: true,
            support: "priority_plus",
        },
    },
];

export async function seedPlans() {
    console.log("📋 Seeding plans...");
    const cashfreeService = new SubscriptionCashfreeService();
    const allowLocalWriteWithoutCashfreeSync =
        process.env.CASHFREE_ALLOW_DB_WITHOUT_SYNC === "true";
    const shouldSyncCashfreePlans =
        process.env.CASHFREE_APP_ID &&
        process.env.CASHFREE_APP_SECRET &&
        process.env.CASHFREE_SKIP_PLAN_SYNC !== "true";

    for (const plan of PLANS) {
        const existing = await prisma.plan.findFirst({ where: { name: plan.name } });

        let upserted: any;
        if (existing) {
            upserted = await prisma.plan.update({ where: { id: existing.id }, data: plan });
        } else {
            upserted = await prisma.plan.create({ data: plan });
        }
        if (shouldSyncCashfreePlans) {
            try {
                await cashfreeService.syncAllPlanCycles(upserted);
            } catch (error: any) {
                if (allowLocalWriteWithoutCashfreeSync) {
                    console.warn(
                        `  ⚠️ Cashfree sync failed for "${upserted.name}", local write retained due to CASHFREE_ALLOW_DB_WITHOUT_SYNC=true: ${error?.message ?? error}`,
                    );
                    continue;
                }

                if (existing) {
                    await prisma.plan.update({
                        where: { id: existing.id },
                        data: {
                            name: existing.name,
                            monthlyPrice: existing.monthlyPrice,
                            quarterlyPrice: existing.quarterlyPrice,
                            yearlyPrice: existing.yearlyPrice,
                            tokenLimit: existing.tokenLimit,
                            features: existing.features as any,
                            isActive: existing.isActive,
                            isDeleted: existing.isDeleted,
                        },
                    });
                } else {
                    await prisma.plan.delete({ where: { id: upserted.id } });
                }

                throw error;
            }
        }
    }

    if (process.env.CASHFREE_SKIP_PLAN_SYNC === "true") {
        console.log("  ℹ️ Cashfree sync explicitly disabled via CASHFREE_SKIP_PLAN_SYNC=true");
    }

    console.log(`  ✅ Plans seeded: ${PLANS.map((p) => p.name).join(", ")}`);
}
