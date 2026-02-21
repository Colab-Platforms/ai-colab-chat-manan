import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import UserService from "./user.service.js";
import { validateUpdateProfileSchema } from "./user.validators.js";

const userService = new UserService();

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await userService.getProfile(req.user!.id);
        sendResponse(res, true, result, "Profile fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Get profile error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { error, value } = validateUpdateProfileSchema(req.body);

        if (error) {
            sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
            return;
        }

        const result = await userService.updateProfile(req.user!.id, value);
        sendResponse(res, true, result, "Profile updated successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Update profile error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await userService.listUsers(req.query);
        sendResponse(res, true, result, "Users fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("List users error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const softDeleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await userService.softDelete(parseInt(req.params.id as string));
        sendResponse(res, true, result, "User deleted successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Delete user error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const makeAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await userService.makeAdmin(parseInt(req.params.id as string));
        sendResponse(res, true, result, "User promoted to ADMIN", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Make admin error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const adminUpdateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await userService.adminUpdateUser(parseInt(req.params.id as string), req.body);
        sendResponse(res, true, result, "User updated successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Admin update user error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};
