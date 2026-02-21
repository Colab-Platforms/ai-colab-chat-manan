import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware";
import * as planController from "./plan.controller.js";

const router = Router();

router.post("/", auth("ADMIN", "SUPERADMIN"), planController.createPlan);
router.get("/", auth("ADMIN", "SUPERADMIN"), planController.listPlans);
router.get("/:id", auth("ADMIN", "SUPERADMIN"), planController.getPlan);
router.put("/:id", auth("ADMIN", "SUPERADMIN"), planController.updatePlan);
router.delete("/:id", auth("ADMIN", "SUPERADMIN"), planController.deletePlan);

export default router;
