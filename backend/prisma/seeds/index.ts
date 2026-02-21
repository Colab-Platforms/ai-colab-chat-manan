import prisma from "@root/prisma";
import { seedRoles } from "./roles.seed.js";
import { seedModelProviders } from "./modelProviders.seed.js";
import { seedModels } from "./models.seed.js";
import { seedPlans } from "./plans.seed.js";
import { seedSuperAdmin } from "./superAdmin.seed.js";

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