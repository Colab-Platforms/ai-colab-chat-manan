import cron from "node-cron";
import dayjs from "dayjs";
import prisma from "@root/prisma.js";
import { sendEmail } from "@/utils/email.js";

type ReminderStage = "D3" | "D1" | "D0";

function getReminderStage(daysLeft: number): ReminderStage | null {
  if (daysLeft === 3) return "D3";
  if (daysLeft === 1) return "D1";
  if (daysLeft === 0) return "D0";
  return null;
}

function buildReminderContent(input: {
  firstName?: string | null;
  planName: string;
  expiresAt: Date;
  daysLeft: number;
}) {
  const userName = (input.firstName || "there").trim();
  const expiryText = dayjs(input.expiresAt).format("D MMM YYYY");
  const when =
    input.daysLeft === 0
      ? "today"
      : input.daysLeft === 1
        ? "tomorrow"
        : `in ${input.daysLeft} days`;
  const subject =
    input.daysLeft === 0
      ? `Your ${input.planName} plan expires today`
      : `${input.planName} renewal reminder`;

  const text = `Hi ${userName},\n\nYour ${input.planName} subscription expires ${when} (${expiryText}). Renew to continue uninterrupted access.\n\nAI Colab Chat`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin:0 0 12px;">Renewal reminder</h2>
      <p>Hi ${userName},</p>
      <p>Your <strong>${input.planName}</strong> subscription expires <strong>${when}</strong> (${expiryText}).</p>
      <p>Renew to continue uninterrupted access.</p>
      <p style="margin-top:20px;">AI Colab Chat</p>
    </div>
  `;
  return { subject, text, html };
}

const task = () => {
  // Daily at 09:00 AM
  cron.schedule("0 9 * * *", async () => {
    console.log("🔄 Running manual renewal reminder cron...");
    try {
      const now = dayjs();
      const subscriptions = await prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          autoRenew: false,
          expiresAt: { not: null },
        },
        include: {
          plan: true,
          user: {
            select: { id: true, email: true, firstName: true },
          },
        },
      });

      for (const sub of subscriptions) {
        if (!sub.expiresAt) continue;
        const expiresAt = dayjs(sub.expiresAt).startOf("day");
        const daysLeft = expiresAt.diff(now.startOf("day"), "day");
        const stage = getReminderStage(daysLeft);
        if (!stage) continue;

        const alreadySent = await prisma.subscriptionReminder.findUnique({
          where: {
            subscriptionId_stage: {
              subscriptionId: sub.id,
              stage,
            },
          },
          select: { id: true },
        });
        if (alreadySent) continue;

        const content = buildReminderContent({
          firstName: sub.user.firstName,
          planName: sub.plan.name,
          expiresAt: sub.expiresAt,
          daysLeft,
        });

        await sendEmail({
          to: sub.user.email,
          subject: content.subject,
          text: content.text,
          html: content.html,
        });

        await prisma.subscriptionReminder.create({
          data: {
            userId: sub.user.id,
            subscriptionId: sub.id,
            stage,
          },
        });
      }

      console.log("✅ Manual renewal reminders completed");
    } catch (error) {
      console.error("❌ Manual renewal reminder cron error:", error);
    }
  });
};

export default task;

