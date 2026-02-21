import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as subscriptionController from "./subscription.controller.js";

const router = Router();

router.post("/", auth("USER", "ADMIN", "SUPERADMIN"), subscriptionController.createSubscription);
router.get("/current", auth("USER", "ADMIN", "SUPERADMIN"), subscriptionController.getCurrentSubscription);
router.patch("/cancel", auth("USER", "ADMIN", "SUPERADMIN"), subscriptionController.cancelSubscription);

export default router;
