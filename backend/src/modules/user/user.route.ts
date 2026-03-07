import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import { upload } from "@/middlewares/upload.js";
import * as userController from "./user.controller.js";

const router = Router();

router.get("/", auth("ADMIN", "SUPERADMIN"), userController.listUsers);
router.get("/profile", auth("USER", "ADMIN", "SUPERADMIN"), userController.getProfile);
router.put("/profile", auth("USER", "ADMIN", "SUPERADMIN"), upload.single("profileImage"), userController.updateProfile);
router.delete("/:id", auth("USER", "ADMIN", "SUPERADMIN"), userController.softDeleteUser);
router.put("/:id", auth("ADMIN", "SUPERADMIN"), userController.adminUpdateUser);
router.get("/:id/usage", auth("ADMIN", "SUPERADMIN"), userController.getUserUsage);
router.get("/:id/subscription", auth("ADMIN", "SUPERADMIN"), userController.getUserSubscription);

export default router;
