import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import DashboardService from "./dashboard.service.js";

const dashboardService = new DashboardService();

export const getDashboardSummary = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await dashboardService.getSummary(req.user!.id);
    sendResponse(
      res,
      true,
      result,
      "Dashboard summary fetched successfully",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    console.error("Get dashboard summary error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};
