import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as dashboardController from "./dashboard.controller.js";

const router = Router();

router.get(
  "/summary",
  auth("USER", "ADMIN", "SUPERADMIN"),
  dashboardController.getDashboardSummary,
);

export default router;
