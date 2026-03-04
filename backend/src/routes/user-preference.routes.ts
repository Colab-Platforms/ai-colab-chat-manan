import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/controllers/user-preference.controller.js";

const router = Router();

// Apply auth middleware to all routes
router.use(auth("USER", "ADMIN", "SUPERADMIN"));

router.get("/", getUserPreferences);
router.put("/", updateUserPreferences);

export default router;
