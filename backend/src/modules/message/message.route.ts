import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as messageController from "./message.controller.js";

const router = Router();

router.post("/", auth("USER", "ADMIN", "SUPERADMIN"), messageController.createMessage);
router.get("/starred", auth("USER", "ADMIN", "SUPERADMIN"), messageController.listStarred);
router.patch(
  "/responses/:responseId/star",
  auth("USER", "ADMIN", "SUPERADMIN"),
  messageController.starResponse,
);

export default router;
