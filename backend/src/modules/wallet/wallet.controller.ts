import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils";
import STATUS_CODES from "@/utils/statusCodes";
import WalletService from "./wallet.service";

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
