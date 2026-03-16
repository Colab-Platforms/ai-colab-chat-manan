import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import WalletService from "./wallet.service.js";

const walletService = new WalletService();

export const getWallet = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await walletService.getWallet(req.user!.id);
        sendResponse(res, true, result, "Wallet fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Get wallet error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await walletService.getTransactions(req.query, req.user!.id);
        sendResponse(res, true, result, "Transactions fetched successfully", STATUS_CODES.OK);
    } catch (error: any) {
        console.error("Get wallet transactions error", error);
        sendResponse(res, false, null, error.message, error.statusCode ?? STATUS_CODES.SERVER_ERROR);
    }
};
