import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware";
import * as folderController from "./folder.controller.js";

const router = Router();

router.post("/", auth("USER", "ADMIN", "SUPERADMIN"), folderController.createFolder);
router.get("/", auth("USER", "ADMIN", "SUPERADMIN"), folderController.listFolders);
router.put("/:id", auth("USER", "ADMIN", "SUPERADMIN"), folderController.updateFolder);
router.delete("/:id", auth("USER", "ADMIN", "SUPERADMIN"), folderController.deleteFolder);

export default router;
