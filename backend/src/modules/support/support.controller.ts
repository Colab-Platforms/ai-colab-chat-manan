import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import * as supportService from "./support.service.js";
import {
  validateRaiseTicketSchema,
  validateContactUsSchema,
  validateUpdateStatusSchema,
} from "./support.validators.js";

export const raiseTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateRaiseTicketSchema(req.body);
    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    await supportService.submitTicket(value, req.user?.id);
    sendResponse(
      res,
      true,
      null,
      "Your ticket has been submitted. Our team will get back to you shortly.",
      STATUS_CODES.CREATED,
    );
  } catch (error: any) {
    console.error("Raise ticket error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const listTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await supportService.listSupportRequests("TICKET", req.query);
    sendResponse(res, true, result, "Tickets fetched successfully", STATUS_CODES.OK);
  } catch (error: any) {
    console.error("List tickets error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const listContactMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await supportService.listSupportRequests("CONTACT", req.query);
    sendResponse(res, true, result, "Contact messages fetched successfully", STATUS_CODES.OK);
  } catch (error: any) {
    console.error("List contact messages error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateUpdateStatusSchema(req.body);
    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const result = await supportService.updateSupportRequestStatus(
      parseInt(req.params.id as string),
      value.status,
    );
    sendResponse(res, true, result, "Status updated successfully", STATUS_CODES.OK);
  } catch (error: any) {
    console.error("Update support status error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const contactUs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateContactUsSchema(req.body);
    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    await supportService.submitContactMessage(value, req.user?.id);
    sendResponse(
      res,
      true,
      null,
      "Thanks for reaching out. We'll respond to your message soon.",
      STATUS_CODES.CREATED,
    );
  } catch (error: any) {
    console.error("Contact us error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};
