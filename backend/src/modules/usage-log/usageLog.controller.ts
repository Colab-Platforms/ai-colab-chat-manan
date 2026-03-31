import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import UsageLogService from "./usageLog.service.js";

const usageLogService = new UsageLogService();

export const listUsageLogs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const callerRole: string = (req.user as any)?.role || "USER";
    const result = await usageLogService.list(req.query, callerRole);
    sendResponse(
      res,
      true,
      result,
      "Usage logs fetched successfully",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    console.error("List usage logs error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const dailyTokensByModel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const daysRaw = parseInt(String(req.query.days ?? "30"), 10);
    const days = Number.isFinite(daysRaw) ? daysRaw : 30;
    const result = await usageLogService.getDailyTokensByModel(userId, days);
    sendResponse(
      res,
      true,
      result,
      "Daily usage by model fetched successfully",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    console.error("Daily tokens by model error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};
