import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as usageLogController from "./usageLog.controller.js";

const router = Router();

router.get(
  "/",
  auth("USER", "ADMIN", "SUPERADMIN"),
  usageLogController.listUsageLogs,
);

export default router;
