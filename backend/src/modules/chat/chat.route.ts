import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as chatController from "./chat.controller.js";
import { streamChat, regenerateChat } from "./chat.stream.js";

const router = Router();

router.post("/", auth("USER", "ADMIN", "SUPERADMIN"), chatController.createChat);
router.get("/", auth("USER", "ADMIN", "SUPERADMIN"), chatController.listChats);
router.get("/shared/:shareId", chatController.getSharedChat);
router.get("/:id", auth("USER", "ADMIN", "SUPERADMIN"), chatController.getChatById);
router.patch("/:id/archive", auth("USER", "ADMIN", "SUPERADMIN"), chatController.archiveChat);
router.patch("/:id/share", auth("USER", "ADMIN", "SUPERADMIN"), chatController.shareChat);
router.put("/:id", auth("USER", "ADMIN", "SUPERADMIN"), chatController.updateChat);
router.delete("/:id", auth("USER", "ADMIN", "SUPERADMIN"), chatController.deleteChat);
router.post("/:chatId/send", auth("USER", "ADMIN", "SUPERADMIN"), streamChat);
router.post("/:chatId/messages/:messageId/regenerate", auth("USER", "ADMIN", "SUPERADMIN"), regenerateChat);
router.post("/:chatId/responses/:responseId/feedback", auth("USER", "ADMIN", "SUPERADMIN"), chatController.feedback);

export default router;
