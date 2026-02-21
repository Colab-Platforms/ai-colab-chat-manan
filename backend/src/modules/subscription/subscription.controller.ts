import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils";
import STATUS_CODES from "@/utils/statusCodes";
import SubscriptionService from "./subscription.service";
import { validateCreateSubscriptionSchema } from "./subscription.validators";

const subscriptionService = new SubscriptionService();

export const createSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateCreateSubscriptionSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }
        const result = await subscriptionService.create(req.user!.id, value);
        sendResponse(res, true, result, "Subscription created successfully", STATUS_CODES.CREATED);
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
