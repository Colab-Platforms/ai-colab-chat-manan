import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as subscriptionController from "./subscription.controller.js";
import { cashfreeWebhook } from "./subscription.webhook.controller.js";

const router = Router();

router.post("/create", auth("USER", "ADMIN", "SUPERADMIN"), subscriptionController.createSubscription);
router.post("/cancel", auth("USER", "ADMIN", "SUPERADMIN"), subscriptionController.cancelSubscription);
router.get("/current", auth("USER", "ADMIN", "SUPERADMIN"), subscriptionController.getCurrentSubscription);
router.post("/webhooks/cashfree", cashfreeWebhook);


export default router;

