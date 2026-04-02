import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import SubscriptionService from "./subscription.service.js";
import { validateCreateSubscriptionSchema } from "./subscription.validators.js";

const subscriptionService = new SubscriptionService();

export const createSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateCreateSubscriptionSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }
        const result = await subscriptionService.create(req.user!.id, value);
        sendResponse(
            res,
            true,
            {
                auth_link: (result as any)?.auth_link ?? null,
                subscription_session_id: (result as any)?.subscription_session_id ?? null,
            },
            "Subscription created successfully",
            STATUS_CODES.CREATED,
        );
    } catch (error: any) {
        console.error("Create subscription error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const getCurrentSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await subscriptionService.getCurrent(req.user!.id);
        sendResponse(res, true, result, "Subscription fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Get subscription error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await subscriptionService.cancel(req.user!.id);
        sendResponse(res, true, result, "Subscription cancelled successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Cancel subscription error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const cancelPendingSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await subscriptionService.cancelPending(req.user!.id);
        sendResponse(res, true, result, "Pending subscription cancelled successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Cancel pending subscription error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const enableAutoPaySubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateCreateSubscriptionSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }
        const result = await subscriptionService.enableAutoPay(req.user!.id, value);
        sendResponse(res, true, result, "AutoPay enablement initiated", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Enable AutoPay error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const disableAutoPaySubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await subscriptionService.disableAutoPay(req.user!.id);
        sendResponse(res, true, result, "AutoPay disabled", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Disable AutoPay error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};
