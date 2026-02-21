import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware";
import * as usageLogController from "./usageLog.controller";

const router = Router();

router.get("/", auth("ADMIN", "SUPERADMIN"), usageLogController.listUsageLogs);

export default router;
