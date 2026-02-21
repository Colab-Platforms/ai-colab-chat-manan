import { Router } from "express";
import authRoutes from "@/modules/auth/auth.route";
import userRoutes from "@/modules/user/user.route";
import folderRoutes from "@/modules/folder/folder.route";
import chatRoutes from "@/modules/chat/chat.route";
import messageRoutes from "@/modules/message/message.route";
import modelResponseRoutes from "@/modules/model-response/modelResponse.route";
import attachmentRoutes from "@/modules/attachment/attachment.route";
import walletRoutes from "@/modules/wallet/wallet.route";
import subscriptionRoutes from "@/modules/subscription/subscription.route";
import planRoutes from "@/modules/plan/plan.route";
import usageLogRoutes from "@/modules/usage-log/usageLog.route";
import modelRoutes from "@/modules/model/model.route";
import modelProviderRoutes from "@/modules/model-provider/modelProvider.route";

const router = Router();

// Public
router.use("/auth", authRoutes);

// User
router.use("/users", userRoutes);
router.use("/folders", folderRoutes);
router.use("/chats", chatRoutes);
router.use("/messages", messageRoutes);
router.use("/model-responses", modelResponseRoutes);
router.use("/attachments", attachmentRoutes);
router.use("/wallet", walletRoutes);
router.use("/subscriptions", subscriptionRoutes);

// Admin
router.use("/plans", planRoutes);
router.use("/usage-logs", usageLogRoutes);
router.use("/models", modelRoutes);

// Super Admin
router.use("/model-providers", modelProviderRoutes);

export default router;