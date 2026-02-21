import prisma from "@root/prisma";

export async function seedModels() {
    console.log("🤖 Seeding models...");

    const openRouter = await prisma.modelProvider.findFirst({ where: { name: "OpenRouter" } });

    if (!openRouter) {
        console.log("  ⚠️ OpenRouter provider not found — run modelProviders seed first.");
        return;
    }

    const MODELS = [
        {
            name: "GPT-4o",
            externalId: "openai/gpt-4o",
            modelProviderId: openRouter.id,
            inputCostPer1k: 2.5,
            outputCostPer1k: 10,
            description: "OpenAI's fast multimodal flagship model",
            isActive: false,
        },
        {
            name: "GPT-4.1",
            externalId: "openai/gpt-4.1",
            modelProviderId: openRouter.id,
            inputCostPer1k: 2,
            outputCostPer1k: 8,
            description: "OpenAI's latest generation model",
            isActive: true,
        },
        {
            name: "Claude 3.5 Sonnet",
            externalId: "anthropic/claude-3.5-sonnet",
            modelProviderId: openRouter.id,
            inputCostPer1k: 3,
            outputCostPer1k: 15,
            description: "Anthropic's most capable model",
            isActive: false,
        },
        {
            name: "Gemini 2.0 Flash",
            externalId: "google/gemini-2.0-flash",
            modelProviderId: openRouter.id,
            inputCostPer1k: 0.1,
            outputCostPer1k: 0.4,
            description: "Google's fast and efficient model",
            isActive: false,
        },
    ];

    for (const model of MODELS) {
        await prisma.model.upsert({
            where: {
                modelProviderId_externalId: {
                    modelProviderId: model.modelProviderId,
                    externalId: model.externalId,
                },
            },
            update: {
                name: model.name,
                inputCostPer1k: model.inputCostPer1k,
                outputCostPer1k: model.outputCostPer1k,
                description: model.description,
                isActive: model.isActive,
            },
            create: model,
        });
    }

    console.log(`  ✅ Models seeded: ${MODELS.map((m) => m.name).join(", ")}`);
}
