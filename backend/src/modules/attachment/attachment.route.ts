import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware";
import { uploadAttachment as multerUpload } from "@/middlewares/uploadMiddleware";
import * as attachmentController from "./attachment.controller.js";

const router = Router();

router.post("/", auth("USER", "ADMIN", "SUPERADMIN"), multerUpload.single("file"), attachmentController.uploadAttachment);

export default router;
