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
   {
      name: "GPT-OSS 20B (Free)",
      externalId: "openai/gpt-oss-20b:free",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD"],
      description: "OpenAI's open-weight model, free tier",
      isFreeModel: true,
      isActive: true,
      tokenMultiplier: 0,
    },
    {
      name: "Nemotron Nano 9B (Free)",
      externalId: "nvidia/nemotron-nano-9b-v2:free",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD"],
      description: "NVIDIA's unified reasoning/chat model, free tier",
      isFreeModel: true,
      isActive: true,
      tokenMultiplier: 0,
    },
    {
      name: "Nemotron 3 Nano 30B (Free)",
      externalId: "nvidia/nemotron-3-nano-30b-a3b:free",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD"],
      description: "NVIDIA's compute-efficient agentic MoE model, free tier",
      isFreeModel: true,
      isActive: true,
      tokenMultiplier: 0,
    },
    {
      name: "Nemotron 3 Super 120B (Free)",
      externalId: "nvidia/nemotron-3-super-120b-a12b:free",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD"],
      isFreeModel: true,
      description: "NVIDIA's 120B hybrid MoE model, free tier",
      isActive: true,
      tokenMultiplier: 0,
    },
    {
      name: "Nemotron 3 Ultra 550B (Free)",
      externalId: "nvidia/nemotron-3-ultra-550b-a55b:free",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD"],
      isFreeModel: true,
      description: "NVIDIA's frontier-scale reasoning/orchestration model, free tier",
      isActive: true,
      tokenMultiplier: 0,
    },
    {
      name: "Nemotron Nano 12B VL (Free)",
      externalId: "nvidia/nemotron-nano-12b-v2-vl:free",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD", "VISION"],
      isFreeModel: true,
      description: "NVIDIA's multimodal video/document reasoning model, free tier",
      isActive: true,
      tokenMultiplier: 0,
    },
    {
      name: "Nemotron 3 Nano Omni (Free)",
      externalId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD", "VISION"],
      isFreeModel: true,
      description: "NVIDIA's multimodal (image/audio/video) reasoning model, free tier",
      isActive: true,
      tokenMultiplier: 0,
    },
    {
      name: "Gemma 4 26B (Free)",
      externalId: "google/gemma-4-26b-a4b-it:free",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD", "VISION"],
      isFreeModel: true,
      description: "Google DeepMind's instruction-tuned MoE model, free tier",
      isActive: true,
      tokenMultiplier: 0,
    },
    {
      name: "Gemma 4 31B (Free)",
      externalId: "google/gemma-4-31b-it:free",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD", "VISION"],
      isFreeModel: true,
      description: "Google DeepMind's dense multimodal model, free tier",
      isActive: true,
      tokenMultiplier: 0,
    },
    {
      name: "North Mini Code (Free)",
      externalId: "cohere/north-mini-code:free",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD"],
      isFreeModel: true,
      description: "Cohere's agentic coding model, free tier",
      isActive: true,
      tokenMultiplier: 0,
    },
    {
      name: "Laguna M.1 (Free)",
      externalId: "poolside/laguna-m.1:free",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD"],
      isFreeModel: true,
      description: "Poolside's flagship coding agent model, free tier",
      isActive: true,
      tokenMultiplier: 0,
    },
    {
      name: "Laguna XS 2.1 (Free)",
      externalId: "poolside/laguna-xs-2.1:free",
      modelProviderId: openRouter.id,
      capabilities: ["STANDARD"],
      isFreeModel: true,
      description: "Poolside's lightweight coding agent model, free tier",
      isActive: true,
      tokenMultiplier: 0,
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
        tokenMultiplier: (model as any).tokenMultiplier ?? 1.0,
      },
      create: {
        ...model,
        capabilities: model.capabilities as any,
      },
    });
  }

  // Retired/dead free model IDs — kept out of MODELS above so the upsert
  // loop doesn't recreate them, and explicitly deactivated here in case
  // they're already in the DB from an earlier seed run.
  // - openrouter/free: superseded by the curated list above (could route to
  //   non-chat guard/classifier models).
  // - meta-llama/llama-3.3-70b-instruct:free: OpenRouter retired the free
  //   variant; the slug now 404s.
  await prisma.model.updateMany({
    where: {
      modelProviderId: openRouter.id,
      externalId: {
        in: [
          "openrouter/free",
          "meta-llama/llama-3.3-70b-instruct:free",
        ],
      },
    },
    data: { isActive: false },
  });

  console.log(`  ✅ Models seeded: ${MODELS.map((m) => m.name).join(", ")}`);
}
