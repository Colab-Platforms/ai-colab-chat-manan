import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as modelProviderController from "./modelProvider.controller.js";

const router = Router();

router.post("/", auth("SUPERADMIN"), modelProviderController.createProvider);
router.get("/", auth("SUPERADMIN"), modelProviderController.listProviders);
router.get("/:id", auth("SUPERADMIN"), modelProviderController.getProvider);
router.put("/:id", auth("SUPERADMIN"), modelProviderController.updateProvider);
router.delete("/:id", auth("SUPERADMIN"), modelProviderController.deleteProvider);

export default router;
