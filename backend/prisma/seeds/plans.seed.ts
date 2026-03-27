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

    for (const plan of PLANS) {
        const existing = await prisma.plan.findFirst({ where: { name: plan.name } });

        let upserted: any;
        if (existing) {
            upserted = await prisma.plan.update({ where: { id: existing.id }, data: plan });
        } else {
            upserted = await prisma.plan.create({ data: plan });
        }
        if (process.env.CASHFREE_APP_ID && process.env.CASHFREE_APP_SECRET) {
            await cashfreeService.syncAllPlanCycles(upserted);
        }
    }

    console.log(`  ✅ Plans seeded: ${PLANS.map((p) => p.name).join(", ")}`);
}
