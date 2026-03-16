import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import {
  getPaginationOptions,
  formatPaginationResponse,
} from "@/utils/paginationUtils.js";
import { buildPrismaQuery } from "prisma-qb";

class WalletService {
  async getWallet(userId: number) {
    const wallet = await prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new ApiError(
        "Wallet not found. Please subscribe to a plan first",
        STATUS_CODES.NOT_FOUND,
      );
    }

    return wallet;
  }

  async getTransactions(query: any, userId: number) {
    const { take, skip, page, pageSize } = getPaginationOptions(query, 10);

    const { where: qbWhere, orderBy } = buildPrismaQuery({
      query,
      searchFields: [
        { field: "referenceId", model: "walletTransaction" },
        { field: "type", model: "walletTransaction" },
      ],
      filterFields: [
        { key: "type", field: "type", type: "string" },
        { key: "walletId", field: "walletId", type: "number" },
      ],
      sortFields: [
        { key: "createdAt", field: "createdAt" },
        { key: "amount", field: "amount" },
      ],
      defaultSort: { key: "createdAt", order: "desc" },
      allowedQueryKeys: ["page", "pageSize"],
    });

    const where: any = {
      ...qbWhere,
      userId,
    };

    const [transactions, totalRecords] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    return formatPaginationResponse(transactions, totalRecords, page, pageSize);
  }
}

export default WalletService;
