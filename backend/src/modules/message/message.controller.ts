import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import MessageService from "./message.service.js";
import {
    validateCreateMessageSchema,
    validateEnhancePromptSchema,
    validateListStarredSchema,
    validateStarResponseSchema,
} from "./message.validators.js";

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

export const starResponse = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateStarResponseSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }

        const responseId = parseInt(req.params.responseId as string);
        if (!responseId || Number.isNaN(responseId)) {
            sendResponse(res, false, null, "Invalid response id", STATUS_CODES.BAD_REQUEST);
            return;
        }

        const result = await messageService.starResponse(req.user!.id, responseId, value.isStarred);
        sendResponse(res, true, result, "Response star updated successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Star response error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const listStarred = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateListStarredSchema(req.query);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }
        const result = await messageService.listStarredResponses(req.user!.id, value);
        sendResponse(res, true, result, "Starred responses fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("List starred responses error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const enhancePrompt = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateEnhancePromptSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }

        const result = await messageService.enhancePrompt(req.user!.id, value);
        sendResponse(res, true, result, "Prompt enhanced successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Enhance prompt error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};
