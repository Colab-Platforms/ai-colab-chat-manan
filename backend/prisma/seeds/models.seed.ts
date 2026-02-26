import prisma from "@root/prisma";

export async function seedModels() {
  console.log("🤖 Seeding models...");

  const openRouter = await prisma.modelProvider.findFirst({
    where: { name: "OpenRouter" },
  });

  if (!openRouter) {
    console.log(
      "  ⚠️ OpenRouter provider not found — run modelProviders seed first.",
    );
    return;
  }

  const MODELS = [
    {
      name: "GPT-4o",
      externalId: "openai/gpt-4o",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD"],
      description: "OpenAI's fast multimodal flagship model",
      isActive: false,
    },
    {
      name: "GPT-4.1",
      externalId: "openai/gpt-4.1",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD"],
      description: "OpenAI's latest generation model",
      isActive: true,
    },
    {
      name: "Claude 3.5 Sonnet",
      externalId: "anthropic/claude-3.5-sonnet",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD"],
      description: "Anthropic's most capable model",
      isActive: false,
    },
    {
      name: "Gemini 2.0 Flash",
      externalId: "google/gemini-2.0-flash",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD"],
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
        capabilities: model.capabilities as any,
        description: model.description,
        isActive: model.isActive,
      },
      create: {
        ...model,
        capabilities: model.capabilities as any,
      },
    });
  }

  console.log(`  ✅ Models seeded: ${MODELS.map((m) => m.name).join(", ")}`);
}
