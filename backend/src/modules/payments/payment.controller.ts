import { Request, Response } from "express";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import PaymentService from "./payment.service.js";
import { validateCreateSubscribeOneTimeSchema } from "./payment.validators.js";

const paymentService = new PaymentService();

export const createSubscribeOneTimePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateCreateSubscribeOneTimeSchema(req.body);
    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const result = await paymentService.createSubscriptionOneTimePayment(req.user!.id, value);
    sendResponse(res, true, result, "One-time payment initiated", STATUS_CODES.CREATED);
  } catch (error: any) {
    console.error("Create one-time payment error", error);
    sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
  }
};

export const cashfreePaymentWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await paymentService.handleCashfreePaymentWebhook(req as any);
    sendResponse(res, true, result, "Processed", STATUS_CODES.OK);
  } catch (error: any) {
    console.error("Cashfree one-time payment webhook error", error);
    sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
  }
};

