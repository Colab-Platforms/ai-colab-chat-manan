import prisma from "@root/prisma";

const PLANS = [
    {
        name: "Free",
        monthlyPrice: 0,
        quarterlyPrice: 0,
        yearlyPrice: 0,
        tokenLimit: 10000,
        features: {
            maxModels: 1,
            attachments: false,
            support: "community",
        },
    },
    {
        name: "Pro",
        monthlyPrice: 19.99,
        quarterlyPrice: 49.99,
        yearlyPrice: 179.99,
        tokenLimit: 500000,
        features: {
            maxModels: -1,
            attachments: true,
            support: "priority",
        },
    },
];

export async function seedPlans() {
    console.log("📋 Seeding plans...");

    for (const plan of PLANS) {
        const existing = await prisma.plan.findFirst({ where: { name: plan.name } });

        if (existing) {
            await prisma.plan.update({ where: { id: existing.id }, data: plan });
        } else {
            await prisma.plan.create({ data: plan });
        }
    }

    console.log(`  ✅ Plans seeded: ${PLANS.map((p) => p.name).join(", ")}`);
}
