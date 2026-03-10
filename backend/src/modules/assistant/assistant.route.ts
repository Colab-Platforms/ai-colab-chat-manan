import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as assistantController from "./assistant.controller.js";

const router = Router();

// Public (authenticated users) – read active assistants for sidebar
router.get(
  "/",
  auth("USER", "ADMIN", "SUPERADMIN"),
  assistantController.listAssistants,
);
router.get(
  "/:id",
  auth("USER", "ADMIN", "SUPERADMIN"),
  assistantController.getAssistant,
);

// Admin only – manage assistants
router.post(
  "/",
  auth("ADMIN", "SUPERADMIN"),
  assistantController.createAssistant,
);
router.put(
  "/:id",
  auth("ADMIN", "SUPERADMIN"),
  assistantController.updateAssistant,
);
router.patch(
  "/:id/toggle",
  auth("ADMIN", "SUPERADMIN"),
  assistantController.toggleAssistant,
);
router.delete(
  "/:id",
  auth("ADMIN", "SUPERADMIN"),
  assistantController.deleteAssistant,
);

export default router;
