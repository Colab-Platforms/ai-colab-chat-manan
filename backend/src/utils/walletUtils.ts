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

/**
 * Calculates adjusted token usage when the user balance is insufficient.
 */
export function calculateAdjustedTokens(
  availableTokens: number,
  billablePrompt: number,
  billableCompletion: number,
  tokenMultiplier: number = 1.0
) {
  const actualAvailable = Math.max(0, availableTokens);
  const requestedTotal = billablePrompt + billableCompletion;

  if (requestedTotal <= actualAvailable) {
    return {
      finalBillablePrompt: billablePrompt,
      finalBillableCompletion: billableCompletion,
      finalBillableTotal: requestedTotal,
      finalRawPrompt: Math.ceil(billablePrompt / tokenMultiplier),
      finalRawCompletion: Math.ceil(billableCompletion / tokenMultiplier),
      finalRawTotal: Math.ceil(requestedTotal / tokenMultiplier),
    };
  }

  // Capped at available
  let finalBillablePrompt = billablePrompt;
  let finalBillableCompletion = billableCompletion;

  if (billablePrompt >= actualAvailable) {
    finalBillablePrompt = actualAvailable;
    finalBillableCompletion = 0;
  } else {
    finalBillablePrompt = billablePrompt;
    finalBillableCompletion = actualAvailable - billablePrompt;
  }

  const finalBillableTotal = finalBillablePrompt + finalBillableCompletion;

  return {
    finalBillablePrompt,
    finalBillableCompletion,
    finalBillableTotal,
    finalRawPrompt: Math.ceil(finalBillablePrompt / tokenMultiplier),
    finalRawCompletion: Math.ceil(finalBillableCompletion / tokenMultiplier),
    finalRawTotal: Math.ceil(finalBillableTotal / tokenMultiplier),
  };
}
