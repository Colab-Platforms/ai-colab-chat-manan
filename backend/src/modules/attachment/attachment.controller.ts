import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils";
import STATUS_CODES from "@/utils/statusCodes";
import AttachmentService from "./attachment.service";
import { validateCreateAttachmentSchema } from "./attachment.validators";

const attachmentService = new AttachmentService();

export const uploadAttachment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateCreateAttachmentSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }

        if (!req.file) {
            sendResponse(res, false, null, "File is required", STATUS_CODES.BAD_REQUEST);
            return;
        }

        const result = await attachmentService.create(req.user!.id, value.messageId, req.file);
        sendResponse(res, true, result, "Attachment uploaded successfully", STATUS_CODES.CREATED);
    } catch (error: any) {
        console.error("Upload attachment error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};
