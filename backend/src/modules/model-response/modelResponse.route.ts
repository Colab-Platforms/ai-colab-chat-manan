import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware";
import * as modelResponseController from "./modelResponse.controller";

const router = Router();

router.post("/complete", auth("USER", "ADMIN", "SUPERADMIN"), modelResponseController.completeResponse);

export default router;
