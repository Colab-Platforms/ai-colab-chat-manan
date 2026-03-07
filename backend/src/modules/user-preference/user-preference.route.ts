import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import {
  getPreferences,
  updatePreferences,
} from "./user-preference.controller.js";

const router = Router();

router.use(auth("USER", "ADMIN", "SUPERADMIN"));

router.get("/", getPreferences);
router.put("/", updatePreferences);

export default router;
