import { Router } from "express";
import * as authController from "./auth.controller.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-email-otp", authController.verifyEmailOtp);
router.post("/resend-email-otp", authController.resendEmailVerificationOtp);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export default router;
