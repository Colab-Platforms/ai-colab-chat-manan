import { Prisma, WalletTransactionType } from "@prisma/client";

interface CreateWalletTransactionParams {
  userId: number;
  walletId: number;
  amount: number;
  type: WalletTransactionType;
  referenceId?: string;
  meta?: any;
}

/**
 * Creates a WalletTransaction record within an existing Prisma transaction.
 * 
 * @param tx The Prisma transaction client
 * @param params Details of the wallet transaction
 */
export async function createWalletTransaction(
  tx: Prisma.TransactionClient,
  params: CreateWalletTransactionParams
) {
  return await tx.walletTransaction.create({
    data: {
      userId: params.userId,
      walletId: params.walletId,
      amount: params.amount,
      type: params.type,
      referenceId: params.referenceId,
      meta: params.meta,
    },
  });
}
