import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as modelProviderController from "./modelProvider.controller.js";

const router = Router();

router.post(
  "/",
  auth("ADMIN", "SUPERADMIN"),
  modelProviderController.createProvider,
);
router.get(
  "/",
  auth("USER", "ADMIN", "SUPERADMIN"),
  modelProviderController.listProviders,
);
router.get(
  "/:id",
  auth("USER", "ADMIN", "SUPERADMIN"),
  modelProviderController.getProvider,
);
router.put(
  "/:id",
  auth("ADMIN", "SUPERADMIN"),
  modelProviderController.updateProvider,
);
router.delete(
  "/:id",
  auth("ADMIN", "SUPERADMIN"),
  modelProviderController.deleteProvider,
);

export default router;
