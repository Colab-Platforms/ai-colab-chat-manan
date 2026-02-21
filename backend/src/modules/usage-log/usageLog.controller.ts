import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils";
import STATUS_CODES from "@/utils/statusCodes";
import UsageLogService from "./usageLog.service";

const usageLogService = new UsageLogService();

export const listUsageLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await usageLogService.list(req.query);
        sendResponse(res, true, result, "Usage logs fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("List usage logs error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};
