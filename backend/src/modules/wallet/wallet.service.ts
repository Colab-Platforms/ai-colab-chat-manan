import prisma from "@root/prisma";
import { ApiError } from "@/utils/ApiError";
import STATUS_CODES from "@/utils/statusCodes";

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
