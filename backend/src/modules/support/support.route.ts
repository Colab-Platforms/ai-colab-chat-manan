import { Router } from "express";
import { auth, optionalAuth } from "@/middlewares/authMiddleware.js";
import * as supportController from "./support.controller.js";

const router = Router();

router.post("/ticket", optionalAuth, supportController.raiseTicket);
router.post("/contact", optionalAuth, supportController.contactUs);

router.get("/tickets", auth("ADMIN", "SUPERADMIN"), supportController.listTickets);
router.get("/contact", auth("ADMIN", "SUPERADMIN"), supportController.listContactMessages);
router.patch("/:id/status", auth("ADMIN", "SUPERADMIN"), supportController.updateStatus);

export default router;
