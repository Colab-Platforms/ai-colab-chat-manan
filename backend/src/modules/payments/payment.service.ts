import dayjs from "dayjs";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { createWalletTransaction } from "@/utils/walletUtils.js";
import PaymentCashfreeService from "./payment.cashfree.service.js";

class PaymentService {
  private cashfreeService = new PaymentCashfreeService();

  private normalizePhone(phoneNumber: string | null | undefined): string {
    const digits = String(phoneNumber ?? "").replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) return digits;
    if (digits.length > 15) return digits.slice(-15);
    return "9999999999";
  }

  private addCycle(now: Date, cycle: "MONTHLY" | "QUARTERLY" | "YEARLY"): Date {
    switch (cycle) {
      case "MONTHLY":
        return dayjs(now).add(1, "month").toDate();
      case "QUARTERLY":
        return dayjs(now).add(3, "month").toDate();
      case "YEARLY":
        return dayjs(now).add(1, "year").toDate();
    }
  }

  async createSubscriptionOneTimePayment(userId: number, data: { planId: number; billingCycle: "MONTHLY" | "QUARTERLY" | "YEARLY" }) {
    const now = new Date();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);
    }

    const plan = await prisma.plan.findFirst({
      where: { id: data.planId, isActive: true, isDeleted: false },
    });
    if (!plan) {
      throw new ApiError("Plan not found", STATUS_CODES.NOT_FOUND);
    }

    const amount = Number(
      data.billingCycle === "MONTHLY"
        ? plan.monthlyPrice
        : data.billingCycle === "QUARTERLY"
          ? plan.quarterlyPrice
          : plan.yearlyPrice,
    );
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError("Plan is not payable via one-time payment", STATUS_CODES.CONFLICT);
    }

    const pendingSub = await prisma.subscription.findFirst({
      where: { userId, status: "PENDING" },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    if (pendingSub) {
      throw new ApiError("You already have a pending payment", STATUS_CODES.CONFLICT);
    }

    const localSubscription = await prisma.subscription.create({
      data: {
        userId,
        planId: data.planId,
        billingCycle: data.billingCycle,
        status: "PENDING",
        autoRenew: false,
        startedAt: now,
      },
    });

    const orderId = `subpay_${userId}_${localSubscription.id}_${Date.now()}`;
    const customerName =
      [user.firstName, user.lastName]
        .filter((part) => typeof part === "string" && part.trim().length > 0)
        .join(" ")
        .trim() || user.email.split("@")[0] || `user_${user.id}`;

    try {
      const order = await this.cashfreeService.createOrder({
        orderId,
        orderAmount: amount,
        customerId: `user_${user.id}`,
        customerName,
        customerEmail: user.email,
        customerPhone: this.normalizePhone(user.phoneNumber),
      });

      return {
        localSubscriptionId: localSubscription.id,
        order_id: order.order_id,
        payment_session_id: order.payment_session_id,
      };
    } catch (error) {
      await prisma.subscription.update({
        where: { id: localSubscription.id },
        data: { status: "CANCELLED", autoRenew: false, expiresAt: now },
      });
      throw error;
    }
  }

  async handleCashfreePaymentWebhook(req: any) {
    this.cashfreeService.verifyWebhookSignature(req);

    const eventType = req.body?.type;
    const data = req.body?.data ?? {};
    const orderId =
      data?.order?.order_id ??
      data?.order_id ??
      data?.payment?.order_id ??
      data?.payment_details?.order_id ??
      data?.cf_order_id ??
      req.body?.order?.order_id ??
      null;
    const paymentStatus =
      String(
        data?.payment?.payment_status ??
          data?.payment_status ??
          data?.order?.order_status ??
          data?.payment_details?.payment_status ??
          "",
      ).toUpperCase();
    const paymentId =
      data?.payment?.cf_payment_id ??
      data?.cf_payment_id ??
      data?.payment_id ??
      data?.payment?.payment_id ??
      null;

    if (!orderId || !String(orderId).startsWith("subpay_")) {
      return { ignored: true, reason: "Not a subscription one-time order" };
    }
    const parts = String(orderId).split("_");
    const localSubscriptionId = Number(parts[2]);
    if (!Number.isFinite(localSubscriptionId) || localSubscriptionId <= 0) {
      return { ignored: true, reason: "Invalid order mapping" };
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: localSubscriptionId },
      include: { plan: true },
    });
    if (!subscription) {
      return { ignored: true, reason: "Local subscription not found" };
    }

    const normalizedType = String(eventType ?? "").toUpperCase();
    const success =
      normalizedType.includes("PAYMENT_SUCCESS") ||
      normalizedType === "ORDER_PAID" ||
      paymentStatus === "SUCCESS" ||
      paymentStatus === "PAID";
    const failed =
      normalizedType.includes("PAYMENT_FAILED") ||
      normalizedType === "PAYMENT_USER_DROPPED" ||
      paymentStatus === "FAILED" ||
      paymentStatus === "CANCELLED";

    if (success) {
      const now = new Date();
      const nextPeriodEnd = this.addCycle(now, subscription.billingCycle);
      const tokenLimit = subscription.plan.tokenLimit;

      await prisma.$transaction(async (tx) => {
        const currentSub = await tx.subscription.findUnique({
          where: { id: subscription.id },
        });
        if (!currentSub) return;
        if (currentSub.lastPaymentId && paymentId && currentSub.lastPaymentId === paymentId) return;

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

        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "ACTIVE",
            autoRenew: false,
            startedAt: now,
            expiresAt: nextPeriodEnd,
            currentPeriodStart: now,
            currentPeriodEnd: nextPeriodEnd,
            nextBillingDate: nextPeriodEnd,
            lastPaymentId: paymentId ?? String(orderId),
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
          referenceId: "one_time_subscription_activation",
          meta: {
            reason: "ONE_TIME_PAYMENT_SUCCESS",
            orderId,
            paymentId,
          },
        });
      });
      return { ignored: false, processed: "success" };
    }

    if (failed) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "CANCELLED",
          autoRenew: false,
          lastPaymentId: paymentId ?? String(orderId),
        },
      });
      return { ignored: false, processed: "failed" };
    }

    return { ignored: true, reason: "Unhandled event" };
  }
}

export default PaymentService;

