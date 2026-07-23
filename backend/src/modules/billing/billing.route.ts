import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as billingController from "./billing.controller.js";

const router = Router();

router.get("/invoices", auth("USER", "ADMIN", "SUPERADMIN"), billingController.getInvoices);

export default router;
