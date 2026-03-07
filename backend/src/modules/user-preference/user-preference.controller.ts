import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import UserPreferenceService from "./user-preference.service.js";
import { validateUpdatePreferencesSchema } from "./user-preference.validators.js";

const userPreferenceService = new UserPreferenceService();

export const getPreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await userPreferenceService.getPreferences(req.user!.id);
    sendResponse(
      res,
      true,
      result,
      "Preferences fetched successfully",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    console.error("Get preferences error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const updatePreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateUpdatePreferencesSchema(req.body);

    if (error) {
      sendResponse(res, false, null, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }

    const result = await userPreferenceService.updatePreferences(
      req.user!.id,
      value,
    );
    sendResponse(
      res,
      true,
      result,
      "Preferences updated successfully",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    console.error("Update preferences error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};
