import { Request, Response } from "express";
import dayjs from "dayjs";
import prisma from "@root/prisma.js";
import { createWalletTransaction } from "@/utils/walletUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import SubscriptionCashfreeService from "./subscription.cashfree.service.js";

const cashfreeService = new SubscriptionCashfreeService();

function addCycle(now: Date, cycle: "MONTHLY" | "QUARTERLY" | "YEARLY") {
  switch (cycle) {
    case "MONTHLY":
      return dayjs(now).add(1, "month").toDate();
    case "QUARTERLY":
      return dayjs(now).add(3, "month").toDate();
    case "YEARLY":
      return dayjs(now).add(1, "year").toDate();
  }
}

function getWebhookSubscriptionId(data: any) {
  return (
    data?.subscription_details?.subscription_id ??
    data?.subscription_id ??
    data?.cf_subscription_id
  );
}

function getWebhookPaymentId(data: any) {
  return (
    data?.cf_payment_id ??
    data?.payment_id ??
    data?.cf_txn_id ??
    data?.authorization_details?.paymentId
  );
}

export async function cashfreeWebhook(req: Request, res: Response) {
  try {
    cashfreeService.verifyWebhookSignature(req as any);
  } catch (error: any) {
    return res
      .status(error?.statusCode ?? STATUS_CODES.UNAUTHORIZED)
      .json({ status: false, message: error?.message ?? "Unauthorized" });
  }

  const eventType = req.body?.type;
  const payloadData = req.body?.data;
  const subscriptionId = getWebhookSubscriptionId(payloadData);

  if (!eventType || !subscriptionId) {
    return res.status(200).json({ status: true, message: "Ignored webhook" });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { cashfreeSubscriptionId: subscriptionId },
    include: { plan: true },
  });
  if (!subscription) {
    return res.status(200).json({ status: true, message: "Subscription not found" });
  }

  const now = new Date();
  const nextPeriodEnd = addCycle(now, subscription.billingCycle);
  const tokenLimit = subscription.plan.tokenLimit;

  if (eventType === "SUBSCRIPTION_STATUS_CHANGE") {
    const status = payloadData?.subscription_details?.subscription_status;

    if (status === "ACTIVE") {
      await prisma.$transaction(async (tx) => {
        await tx.subscription.updateMany({
          where: {
            userId: subscription.userId,
            id: { not: subscription.id },
            status: "ACTIVE",
          },
          data: {
            status: "CANCELLED",
            autoRenew: false,
            expiresAt: now,
          },
        });

        const updated = await tx.subscription.updateMany({
          where: { id: subscription.id, status: { not: "ACTIVE" } },
          data: {
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: nextPeriodEnd,
            nextBillingDate: nextPeriodEnd,
          },
        });

        if (updated.count > 0) {
          const wallet = await tx.userWallet.upsert({
            where: { userId: subscription.userId },
            create: {
              userId: subscription.userId,
              tokensRemaining: tokenLimit,
              tokensUsed: 0,
              currentPeriodStart: now,
              currentPeriodEnd: nextPeriodEnd,
            },
            update: {
              tokensRemaining: tokenLimit,
              tokensUsed: 0,
              currentPeriodStart: now,
              currentPeriodEnd: nextPeriodEnd,
            },
          });

          await createWalletTransaction(tx, {
            userId: subscription.userId,
            walletId: wallet.id,
            amount: tokenLimit,
            type: "CREDIT",
            referenceId: "subscription_activation",
            meta: { reason: "SUBSCRIPTION_ACTIVE" },
          });
        }
      });
    } else if (status === "CUSTOMER_CANCELLED") {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "CANCELLED", autoRenew: false },
      });
    }

    return res.status(200).json({ status: true, message: "Processed" });
  }

  if (eventType === "SUBSCRIPTION_PAYMENT_SUCCESS") {
    const paymentId = getWebhookPaymentId(payloadData);

    await prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: {
          userId: subscription.userId,
          id: { not: subscription.id },
          status: "ACTIVE",
        },
        data: {
          status: "CANCELLED",
          autoRenew: false,
          expiresAt: now,
        },
      });

      const currentSub = await tx.subscription.findUnique({
        where: { id: subscription.id },
      });
      if (!currentSub) return;
      if (paymentId && currentSub.lastPaymentId === paymentId) return;

      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          lastPaymentId: paymentId,
          currentPeriodStart: now,
          currentPeriodEnd: nextPeriodEnd,
          nextBillingDate: nextPeriodEnd,
        },
      });

      const wallet = await tx.userWallet.upsert({
        where: { userId: subscription.userId },
        create: {
          userId: subscription.userId,
          tokensRemaining: tokenLimit,
          tokensUsed: 0,
          currentPeriodStart: now,
          currentPeriodEnd: nextPeriodEnd,
        },
        update: {
          tokensRemaining: tokenLimit,
          tokensUsed: 0,
          currentPeriodStart: now,
          currentPeriodEnd: nextPeriodEnd,
        },
      });

      await createWalletTransaction(tx, {
        userId: subscription.userId,
        walletId: wallet.id,
        amount: tokenLimit,
        type: "CREDIT",
        referenceId: "monthly_renewal",
        meta: { reason: "PAYMENT_SUCCESS", paymentId },
      });
    });

    return res.status(200).json({ status: true, message: "Processed" });
  }

  if (eventType === "SUBSCRIPTION_PAYMENT_FAILED") {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "PAST_DUE" },
    });
    return res.status(200).json({ status: true, message: "Processed" });
  }

  if (eventType === "SUBSCRIPTION_PAYMENT_CANCELLED") {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED", autoRenew: false },
    });
    return res.status(200).json({ status: true, message: "Processed" });
  }

  return res.status(200).json({ status: true, message: "Ignored event type" });
}

