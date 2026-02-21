import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware";
import * as walletController from "./wallet.controller";

const router = Router();

router.get("/", auth("USER", "ADMIN", "SUPERADMIN"), walletController.getWallet);

export default router;
