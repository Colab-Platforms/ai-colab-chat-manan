import prisma from "@root/prisma";
import { seedRoles } from "./roles.seed";
import { seedModelProviders } from "./modelProviders.seed";
import { seedModels } from "./models.seed";
import { seedPlans } from "./plans.seed";
import { seedSuperAdmin } from "./superAdmin.seed";

async function main() {
    console.log("🌱 Starting seed...\n");

    // Order matters — dependencies first
    await seedRoles();
    await seedModelProviders();
    await seedModels();
    await seedPlans();
    await seedSuperAdmin();

    console.log("\n✅ All seeds completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });