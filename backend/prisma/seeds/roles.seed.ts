import prisma from "@root/prisma";

const ROLES = ["USER", "ADMIN", "SUPER_ADMIN"];

export async function seedRoles() {
    console.log("🔐 Seeding roles...");

    for (const name of ROLES) {
        await prisma.role.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }

    console.log(`  ✅ Roles seeded: ${ROLES.join(", ")}`);
}
