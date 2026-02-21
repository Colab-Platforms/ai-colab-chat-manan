import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware";
import * as messageController from "./message.controller.js";

const router = Router();

router.post("/", auth("USER", "ADMIN", "SUPERADMIN"), messageController.createMessage);

export default router;
