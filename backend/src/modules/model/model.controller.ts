import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import ModelService from "./model.service.js";
import { validateCreateModelSchema, validateUpdateModelSchema } from "./model.validators.js";

const modelService = new ModelService();

export const createModel = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateCreateModelSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }
        const result = await modelService.create(value);
        sendResponse(res, true, result, "Model created successfully", STATUS_CODES.CREATED);
    } catch (error: any) {
        console.error("Create model error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const listModels = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await modelService.list(req.query);
        sendResponse(res, true, result, "Models fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("List models error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const getModel = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await modelService.getById(parseInt(req.params.id as string));
        sendResponse(res, true, result, "Model fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Get model error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const updateModel = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateUpdateModelSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }
        const result = await modelService.update(parseInt(req.params.id as string), value);
        sendResponse(res, true, result, "Model updated successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Update model error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const deleteModel = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await modelService.softDelete(parseInt(req.params.id as string));
        sendResponse(res, true, result, "Model deleted successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Delete model error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};
