import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils";
import STATUS_CODES from "@/utils/statusCodes";
import PlanService from "./plan.service.js";
import { validateCreatePlanSchema, validateUpdatePlanSchema } from "./plan.validators.js";

const planService = new PlanService();

export const createPlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateCreatePlanSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }
        const result = await planService.create(value);
        sendResponse(res, true, result, "Plan created successfully", STATUS_CODES.CREATED);
    } catch (error: any) {
        console.error("Create plan error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const listPlans = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await planService.list(req.query);
        sendResponse(res, true, result, "Plans fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("List plans error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const getPlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await planService.getById(parseInt(req.params.id as string));
        sendResponse(res, true, result, "Plan fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Get plan error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const updatePlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateUpdatePlanSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }
        const result = await planService.update(parseInt(req.params.id as string), value);
        sendResponse(res, true, result, "Plan updated successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Update plan error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const deletePlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await planService.softDelete(parseInt(req.params.id as string));
        sendResponse(res, true, result, "Plan deleted successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Delete plan error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};
