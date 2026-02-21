import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import ModelResponseService from "./modelResponse.service.js";
import { validateCompleteResponseSchema } from "./modelResponse.validators.js";

const modelResponseService = new ModelResponseService();

export const completeResponse = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateCompleteResponseSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }
        const result = await modelResponseService.completeResponse(req.user!.id, value);
        sendResponse(res, true, result, "Response completed successfully", STATUS_CODES.CREATED);
    } catch (error: any) {
        console.error("Complete response error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};
