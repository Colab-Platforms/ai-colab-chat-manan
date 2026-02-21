import { Router } from "express";
import authRoutes from "@/modules/auth/auth.route.js";
import userRoutes from "@/modules/user/user.route.js";
import folderRoutes from "@/modules/folder/folder.route.js";
import chatRoutes from "@/modules/chat/chat.route.js";
import messageRoutes from "@/modules/message/message.route.js";
import modelResponseRoutes from "@/modules/model-response/modelResponse.route.js";
import attachmentRoutes from "@/modules/attachment/attachment.route.js";
import walletRoutes from "@/modules/wallet/wallet.route.js";
import subscriptionRoutes from "@/modules/subscription/subscription.route.js";
import planRoutes from "@/modules/plan/plan.route.js";
import usageLogRoutes from "@/modules/usage-log/usageLog.route.js";
import modelRoutes from "@/modules/model/model.route.js";
import modelProviderRoutes from "@/modules/model-provider/modelProvider.route.js";

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