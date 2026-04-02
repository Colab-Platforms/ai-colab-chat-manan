import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as subscriptionController from "./subscription.controller.js";
import { cashfreeWebhook } from "./subscription.webhook.controller.js";

const router = Router();

router.post("/create", auth("USER", "ADMIN", "SUPERADMIN"), subscriptionController.createSubscription);
router.post("/enable-autopay", auth("USER", "ADMIN", "SUPERADMIN"), subscriptionController.enableAutoPaySubscription);
router.post("/disable-autopay", auth("USER", "ADMIN", "SUPERADMIN"), subscriptionController.disableAutoPaySubscription);
router.post("/cancel", auth("USER", "ADMIN", "SUPERADMIN"), subscriptionController.cancelSubscription);
router.post("/cancel-pending", auth("USER", "ADMIN", "SUPERADMIN"), subscriptionController.cancelPendingSubscription);
router.get("/current", auth("USER", "ADMIN", "SUPERADMIN"), subscriptionController.getCurrentSubscription);
router.post("/webhooks/cashfree", cashfreeWebhook);


export default router;

