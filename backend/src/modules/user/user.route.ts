import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware";
import * as userController from "./user.controller.js";

const router = Router();

router.get("/profile", auth("USER", "ADMIN", "SUPERADMIN"), userController.getProfile);
router.put("/profile", auth("USER", "ADMIN", "SUPERADMIN"), userController.updateProfile);
router.get("/", auth("ADMIN", "SUPERADMIN"), userController.listUsers);
router.delete("/:id", auth("ADMIN", "SUPERADMIN"), userController.softDeleteUser);
router.put("/:id", auth("ADMIN", "SUPERADMIN"), userController.adminUpdateUser);
router.patch("/:id/make-admin", auth("SUPERADMIN"), userController.makeAdmin);

export default router;
