import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils";
import STATUS_CODES from "@/utils/statusCodes";
import AuthService from "./auth.service.js";
import { validateRegisterSchema, validateLoginSchema, validateAdminLoginSchema } from "./auth.validators.js";

const authService = new AuthService();

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateRegisterSchema(req.body);

        if (error) {
            console.error("Register validation error", error);
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }

        const result = await authService.register(value);
        sendResponse(res, true, result, "User registered successfully", STATUS_CODES.CREATED);
    } catch (error: any) {
        console.error("Register error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateLoginSchema(req.body);

        if (error) {
            console.error("Login validation error", error);
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }

        const result = await authService.login(value);
        sendResponse(res, true, result, "You logged in successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Login error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateAdminLoginSchema(req.body);

        if (error) {
            console.error("Admin login validation error", error);
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }

        const result = await authService.loginAdmin(value);
        sendResponse(res, true, result, "You logged in successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Admin login error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};