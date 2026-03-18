import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import ContextService from "./context.service.js";
import {
  validateCreateContextSchema,
  validateUpdateContextSchema,
} from "./context.validators.js";

const contextService = new ContextService();

export const createContext = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { error, value } = validateCreateContextSchema(req.body);
    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const result = await contextService.create(req.user!.id, value);
    sendResponse(
      res,
      true,
      result,
      "Context created successfully",
      STATUS_CODES.CREATED
    );
  } catch (error: any) {
    console.error("Create context error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR
    );
  }
};

export const listContexts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await contextService.list(req.user!.id, req.query);
    sendResponse(
      res,
      true,
      result,
      "Contexts fetched successfully",
      STATUS_CODES.OK
    );
  } catch (error: any) {
    console.error("List contexts error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR
    );
  }
};

export const getContextById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await contextService.getById(
      req.user!.id,
      parseInt(req.params.id as string)
    );
    sendResponse(
      res,
      true,
      result,
      "Context fetched successfully",
      STATUS_CODES.OK
    );
  } catch (error: any) {
    console.error("Get context by id error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR
    );
  }
};

export const updateContext = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { error, value } = validateUpdateContextSchema(req.body);
    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const result = await contextService.update(
      req.user!.id,
      parseInt(req.params.id as string),
      value
    );
    sendResponse(
      res,
      true,
      result,
      "Context updated successfully",
      STATUS_CODES.OK
    );
  } catch (error: any) {
    console.error("Update context error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR
    );
  }
};

export const deleteContext = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await contextService.delete(
      req.user!.id,
      parseInt(req.params.id as string)
    );
    sendResponse(
      res,
      true,
      result,
      "Context deleted successfully",
      STATUS_CODES.OK
    );
  } catch (error: any) {
    console.error("Delete context error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR
    );
  }
};

export const getContextForSidebar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await contextService.getForSidebar(req.user!.id, req.query);
    sendResponse(
      res,
      true,
      result,
      "Sidebar contexts fetched successfully",
      STATUS_CODES.OK
    );
  } catch (error: any) {
    console.error("Get context for sidebar error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR
    );
  }
};
