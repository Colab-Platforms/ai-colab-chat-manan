import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as walletController from "./wallet.controller.js";

const router = Router();

router.get("/", auth("USER", "ADMIN", "SUPERADMIN"), walletController.getWallet);
router.get("/transactions", auth("USER", "ADMIN", "SUPERADMIN"), walletController.getTransactions);

export default router;
