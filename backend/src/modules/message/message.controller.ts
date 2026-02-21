import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import MessageService from "./message.service.js";
import { validateCreateMessageSchema } from "./message.validators.js";

const messageService = new MessageService();

export const createMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateCreateMessageSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }
        const result = await messageService.create(req.user!.id, value);
        sendResponse(res, true, result, "Message created successfully", STATUS_CODES.CREATED);
    } catch (error: any) {
        console.error("Create message error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};
