import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import AssistantService from "./assistant.service.js";
import {
  validateCreateAssistant,
  validateUpdateAssistant,
} from "./assistant.validators.js";

const assistantService = new AssistantService();

export const createAssistant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateCreateAssistant(req.body);
    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const result = await assistantService.create(value);
    sendResponse(
      res,
      true,
      result,
      "Assistant created successfully",
      STATUS_CODES.CREATED,
    );
  } catch (error: any) {
    console.error("Create assistant error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const listAssistants = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await assistantService.list(req.query);
    sendResponse(
      res,
      true,
      result,
      "Assistants fetched successfully",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    console.error("List assistants error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const getAssistant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await assistantService.getById(
      parseInt(req.params.id as string),
    );
    sendResponse(
      res,
      true,
      result,
      "Assistant fetched successfully",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    console.error("Get assistant error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const updateAssistant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateUpdateAssistant(req.body);
    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }
    const result = await assistantService.update(
      parseInt(req.params.id as string),
      value,
    );
    sendResponse(
      res,
      true,
      result,
      "Assistant updated successfully",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    console.error("Update assistant error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const toggleAssistant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await assistantService.toggleActive(
      parseInt(req.params.id as string),
    );
    sendResponse(
      res,
      true,
      result,
      `Assistant ${result.isActive ? "activated" : "deactivated"} successfully`,
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    console.error("Toggle assistant error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const deleteAssistant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await assistantService.softDelete(
      parseInt(req.params.id as string),
    );
    sendResponse(
      res,
      true,
      result,
      "Assistant deleted successfully",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    console.error("Delete assistant error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};
