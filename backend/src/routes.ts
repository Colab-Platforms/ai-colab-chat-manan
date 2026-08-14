import { Router } from "express";
import authRoutes from "@/modules/auth/auth.route.js";
import userRoutes from "@/modules/user/user.route.js";
import folderRoutes from "@/modules/folder/folder.route.js";
import chatRoutes from "@/modules/chat/chat.route.js";
import messageRoutes from "@/modules/message/message.route.js";
import modelResponseRoutes from "@/modules/model-response/modelResponse.route.js";
import attachmentRoutes from "@/modules/attachment/attachment.route.js";
import walletRoutes from "@/modules/wallet/wallet.route.js";
import planRoutes from "@/modules/plan/plan.route.js";
import usageLogRoutes from "@/modules/usage-log/usageLog.route.js";
import modelRoutes from "@/modules/model/model.route.js";
import modelProviderRoutes from "@/modules/model-provider/modelProvider.route.js";
import userPreferenceRoutes from "@/modules/user-preference/user-preference.route.js";
import assistantRoutes from "@/modules/assistant/assistant.route.js";
import contextRoutes from "@/modules/context/context.route.js";
import subscriptionRoutes from "@/modules/subscription/subscription.route.js";
import dashboardRoutes from "@/modules/dashboard/dashboard.route.js";
import paymentRoutes from "@/modules/payments/payment.route.js";
import billingRoutes from "@/modules/billing/billing.route.js";
import supportRoutes from "@/modules/support/support.route.js";




const router = Router();

router.get("/health", (_req, res) => {
  res.send("Colab Platform ai Backend is running!");
});
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/folders", folderRoutes);
router.use("/chats", chatRoutes);
router.use("/messages", messageRoutes);
router.use("/model-responses", modelResponseRoutes);
router.use("/attachments", attachmentRoutes);
router.use("/wallet", walletRoutes);
router.use("/subscription", subscriptionRoutes);
router.use("/plans", planRoutes);
router.use("/usage-logs", usageLogRoutes);
router.use("/models", modelRoutes);
router.use("/model-providers", modelProviderRoutes);
router.use("/preferences", userPreferenceRoutes);
router.use("/assistants", assistantRoutes);
router.use("/contexts", contextRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/payments", paymentRoutes);
router.use("/billing", billingRoutes);
router.use("/support", supportRoutes);

export default router;