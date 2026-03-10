import prisma from "@root/prisma.js";
import { Prisma } from "@prisma/client";

function supportsAssistantGradientFields(): boolean {
  const scalarEnum = (Prisma as any).AssistantScalarFieldEnum;
  if (!scalarEnum) return false;
  return (
    Object.prototype.hasOwnProperty.call(scalarEnum, "bgFrom") &&
    Object.prototype.hasOwnProperty.call(scalarEnum, "bgVia") &&
    Object.prototype.hasOwnProperty.call(scalarEnum, "bgTo") &&
    Object.prototype.hasOwnProperty.call(scalarEnum, "bgFromDark") &&
    Object.prototype.hasOwnProperty.call(scalarEnum, "bgViaDark") &&
    Object.prototype.hasOwnProperty.call(scalarEnum, "bgToDark")
  );
}

export async function seedAssistants() {
  console.log("🤖 Seeding assistants...");

  const assistants = [
    {
      name: "Legal Advisor",
      description:
        "A practical legal guidance assistant for contracts, compliance, policy review, and risk awareness.",
      icon: "Scale",
      bgFrom: "#e8f0ff",
      bgVia: "#dbeafe",
      bgTo: "#ede9fe",
      bgFromDark: "#172554",
      bgViaDark: "#1e3a8a",
      bgToDark: "#312e81",
      temperature: 0.3,
      systemPrompt: `You are an experienced legal advisor assistant.
Give clear, practical, and risk-aware guidance on contracts, compliance, policies, and legal process questions.
Explain what is generally safe vs risky, ask clarifying questions when needed, and suggest when the user should consult a licensed attorney.
Do not present uncertain information as legal fact.`,
      suggestedPrompts: [
        "Brainstorm legal approaches for...",
        "Help me write a contract clause for...",
        "Explain how this policy affects...",
      ],
    },
    {
      name: "Software Engineer",
      description:
        "A senior full-stack engineer who helps you write better code, debug issues, and understand engineering concepts.",
      icon: "Code2",
      bgFrom: "#eaf3ff",
      bgVia: "#dbeafe",
      bgTo: "#e0f2fe",
      bgFromDark: "#0b1220",
      bgViaDark: "#111827",
      bgToDark: "#1f2937",
      temperature: 0.3,
      systemPrompt: `You are a Senior Software Engineer with expertise across the full stack. You write clean, performant, and maintainable code.

Your expertise includes:
- Frontend: React, Next.js, TypeScript, CSS
- Backend: Node.js, Python, Go, REST and GraphQL APIs
- Databases: PostgreSQL, MongoDB, Redis
- DevOps: Docker, CI/CD, cloud platforms (AWS, GCP, Vercel)
- Software architecture and system design
- Code review and best practices

How you respond:
- Always provide working, production-ready code with clear comments
- Explain *why*, not just *what* — help the user understand the concept
- Mention edge cases, performance implications, and potential pitfalls
- Suggest modern best practices and tooling
- Ask for tech stack context if it matters for the answer

Response format:
**Explanation** (brief, clear overview)

\`\`\`language
// clean, working code example
\`\`\`

**Key Points** – what to know, edge cases to handle
**Alternative Approaches** – when there are meaningful trade-offs
Never write insecure, deprecated, or anti-pattern code without explicitly calling it out.`,
      suggestedPrompts: [
        "Brainstorm technical approaches for...",
        "Help me write a function for...",
        "Explain how this code works...",
      ],
    },
    {
      name: "Marketing",
      description:
        "A growth-focused marketing assistant for strategy, campaigns, positioning, and conversion-oriented messaging.",
      icon: "Megaphone",
      bgFrom: "#fff7ed",
      bgVia: "#ffedd5",
      bgTo: "#fde68a",
      bgFromDark: "#451a03",
      bgViaDark: "#7c2d12",
      bgToDark: "#78350f",
      temperature: 0.7,
      systemPrompt: `You are a senior marketing strategist.
Help with campaign planning, audience segmentation, messaging, channel strategy, and performance optimization.
Prioritize practical plans, measurable KPIs, and clear next actions.
When context is missing, ask for product, audience, goal, and budget before final recommendations.`,
      suggestedPrompts: [
        "Brainstorm campaign ideas for...",
        "Help me write ad copy for...",
        "Explain how to improve conversion for...",
      ],
    },
    {
      name: "Content Writer",
      description:
        "A professional content strategist and writer for blogs, social media, marketing copy, and SEO-optimized content.",
      icon: "PenLine",
      bgFrom: "#fdf2f8",
      bgVia: "#fae8ff",
      bgTo: "#e9d5ff",
      bgFromDark: "#4a044e",
      bgViaDark: "#581c87",
      bgToDark: "#3b0764",
      temperature: 0.8,
      systemPrompt: `You are a professional Content Writer and Strategist with deep expertise in digital marketing, SEO, and brand storytelling.

Your specialties include:
- Blog posts and long-form articles (SEO-optimized)
- Social media copy (LinkedIn, Twitter/X, Instagram)
- Email marketing and newsletters
- Product descriptions and landing page copy
- Video scripts and podcast outlines
- Brand voice development

How you respond:
- Match the tone and voice to the audience specified — professional, casual, witty, authoritative
- Write engaging hooks, scannable subheadings, and strong CTAs
- Naturally incorporate keywords for SEO without keyword stuffing
- Offer variations when multiple angles could work
- Ask about target audience, platform, and goals before starting if not specified

Response format (adapt based on content type):
- For articles: Title, Meta Description, Outline → Full Draft
- For social posts: Hook, Body, CTA, Hashtag suggestions
- For emails: Subject Line options, Preview Text, Full Body

Always prioritize clarity, engagement, and the reader's experience over word count.`,
      suggestedPrompts: [
        "Brainstorm content ideas for...",
        "Help me write a blog intro for...",
        "Explain how to make this copy stronger...",
      ],
    },
  ];

  await prisma.assistant.updateMany({
    where: { name: "Startup Advisor", isDeleted: false },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  for (const data of assistants) {
    const canPersistGradient = supportsAssistantGradientFields();
    const gradientData = canPersistGradient
      ? {
          bgFrom: (data as any).bgFrom ?? null,
          bgVia: (data as any).bgVia ?? null,
          bgTo: (data as any).bgTo ?? null,
          bgFromDark: (data as any).bgFromDark ?? null,
          bgViaDark: (data as any).bgViaDark ?? null,
          bgToDark: (data as any).bgToDark ?? null,
        }
      : {};

    const {
      bgFrom,
      bgVia,
      bgTo,
      bgFromDark,
      bgViaDark,
      bgToDark,
      ...baseData
    } = data as any;
    const existing = await prisma.assistant.findFirst({
      where: { name: data.name },
      select: { id: true },
    });
    if (existing) {
      try {
        await prisma.assistant.update({
          where: { id: existing.id },
          data: {
            ...baseData,
            ...gradientData,
            isDeleted: false,
            deletedAt: null,
            isActive: true,
          },
          select: { id: true },
        });
      } catch (error: any) {
        if (error?.code !== "P2022") throw error;
        await prisma.assistant.update({
          where: { id: existing.id },
          data: {
            ...baseData,
            isDeleted: false,
            deletedAt: null,
            isActive: true,
          },
          select: { id: true },
        });
      }
    } else {
      try {
        await prisma.assistant.create({
          data: {
            ...baseData,
            ...gradientData,
            slug: `${data.name.toLowerCase().replace(/\s+/g, "-")}`,
            isActive: true,
          },
          select: { id: true },
        });
      } catch (error: any) {
        if (error?.code !== "P2022") throw error;
        await prisma.assistant.create({
          data: {
            ...baseData,
            slug: `${data.name.toLowerCase().replace(/\s+/g, "-")}`,
            isActive: true,
          },
          select: { id: true },
        });
      }
    }
    console.log(`  ✅ Assistant: ${data.name}`);
  }
}
