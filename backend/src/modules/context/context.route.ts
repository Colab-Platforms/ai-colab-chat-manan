import { Router } from "express";
import { auth } from "@/middlewares/authMiddleware.js";
import * as contextController from "./context.controller.js";

const router = Router();

// VERY IMPORTANT: Put /sidebar before /:id to avoid "sidebar" being parsed as the ID parameter
router.get("/sidebar", auth("USER", "ADMIN", "SUPERADMIN"), contextController.getContextForSidebar);
router.get("/", auth("USER", "ADMIN", "SUPERADMIN"), contextController.listContexts);
router.get("/:id", auth("USER", "ADMIN", "SUPERADMIN"), contextController.getContextById);
router.post("/", auth("USER", "ADMIN", "SUPERADMIN"), contextController.createContext);
router.put("/:id", auth("USER", "ADMIN", "SUPERADMIN"), contextController.updateContext);
router.delete("/:id", auth("USER", "ADMIN", "SUPERADMIN"), contextController.deleteContext);

export default router;
