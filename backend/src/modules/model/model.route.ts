import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as modelController from "./model.controller.js";

const router = Router();

router.post("/", auth("ADMIN", "SUPERADMIN"), modelController.createModel);
router.get("/", modelController.listModels);
router.get("/:id", auth("USER", "ADMIN", "SUPERADMIN"), modelController.getModel);
router.put("/:id", auth("ADMIN", "SUPERADMIN"), modelController.updateModel);
router.delete("/:id", auth("ADMIN", "SUPERADMIN"), modelController.deleteModel);

export default router;
  