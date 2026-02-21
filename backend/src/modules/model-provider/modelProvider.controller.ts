import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import ModelProviderService from "./modelProvider.service.js";
import { validateCreateModelProviderSchema, validateUpdateModelProviderSchema } from "./modelProvider.validators.js";

const modelProviderService = new ModelProviderService();

export const createProvider = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateCreateModelProviderSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }
        const result = await modelProviderService.create(value);
        sendResponse(res, true, result, "Model provider created successfully", STATUS_CODES.CREATED);
    } catch (error: any) {
        console.error("Create provider error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const listProviders = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await modelProviderService.list(req.query);
        sendResponse(res, true, result, "Model providers fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("List providers error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const getProvider = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await modelProviderService.getById(parseInt(req.params.id as string));
        sendResponse(res, true, result, "Model provider fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Get provider error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const updateProvider = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateUpdateModelProviderSchema(req.body);
        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }
        const result = await modelProviderService.update(parseInt(req.params.id as string), value);
        sendResponse(res, true, result, "Model provider updated successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Update provider error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const deleteProvider = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await modelProviderService.softDelete(parseInt(req.params.id as string));
        sendResponse(res, true, result, "Model provider deleted successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Delete provider error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};
