import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import BillingService from "./billing.service.js";

const billingService = new BillingService();

export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await billingService.getInvoices(req.query, req.user!.id);
    sendResponse(res, true, result, "Invoices fetched successfully", STATUS_CODES.OK);
  } catch (error: any) {
    console.error("Get invoices error", error);
    sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
  }
};
