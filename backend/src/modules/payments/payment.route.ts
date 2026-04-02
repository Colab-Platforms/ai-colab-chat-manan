import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as paymentController from "./payment.controller.js";

const router = Router();

router.post(
  "/subscribe-one-time/create",
  auth("USER", "ADMIN", "SUPERADMIN"),
  paymentController.createSubscribeOneTimePayment,
);
router.post("/webhooks/cashfree", paymentController.cashfreePaymentWebhook);

export default router;

