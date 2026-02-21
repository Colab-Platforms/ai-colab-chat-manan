import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";

class WalletService {
    async getWallet(userId: number) {
        const wallet = await prisma.userWallet.findUnique({
            where: { userId },
        });

        if (!wallet) {
            throw new ApiError("Wallet not found. Please subscribe to a plan first", STATUS_CODES.NOT_FOUND);
        }

        return wallet;
    }
}

export default WalletService;
