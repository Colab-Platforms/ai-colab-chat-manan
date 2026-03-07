import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import AttachmentService from "./attachment.service.js";
import { validateCreateAttachmentSchema } from "./attachment.validators.js";

const attachmentService = new AttachmentService();

export const presendAttachment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.file) {
      sendResponse(
        res,
        false,
        null,
        "File is required",
        STATUS_CODES.BAD_REQUEST,
      );
      return;
    }

    const result = await attachmentService.presend(req.file);
    sendResponse(
      res,
      true,
      result,
      "File uploaded successfully",
      STATUS_CODES.CREATED,
    );
  } catch (error: any) {
    console.error("Presend attachment error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

/** DELETE /attachments/:id — delete a presend attachment */
export const deleteAttachment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      sendResponse(res, false, null, "Invalid ID", STATUS_CODES.BAD_REQUEST);
      return;
    }

    await attachmentService.delete(id);
    sendResponse(
      res,
      true,
      null,
      "Attachment deleted successfully",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    console.error("Delete attachment error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

/** POST /attachments — legacy: upload tied to an existing message */
export const uploadAttachment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateCreateAttachmentSchema(req.body);
    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }

    if (!req.file) {
      sendResponse(
        res,
        false,
        null,
        "File is required",
        STATUS_CODES.BAD_REQUEST,
      );
      return;
    }

    const result = await attachmentService.create(
      req.user!.id,
      value.messageId,
      req.file,
    );
    sendResponse(
      res,
      true,
      result,
      "Attachment uploaded successfully",
      STATUS_CODES.CREATED,
    );
  } catch (error: any) {
    console.error("Upload attachment error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};
