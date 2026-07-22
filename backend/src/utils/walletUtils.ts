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
  tokenMultiplier: number = 1.0,
  rawPrompt: number = billablePrompt,
  rawCompletion: number = billableCompletion,
) {
  const actualAvailable = Math.max(0, availableTokens);
  const requestedTotal = billablePrompt + billableCompletion;
  const rawTotal = rawPrompt + rawCompletion;

  if (requestedTotal <= actualAvailable) {
    return {
      finalBillablePrompt: billablePrompt,
      finalBillableCompletion: billableCompletion,
      finalBillableTotal: requestedTotal,
      finalRawPrompt: rawPrompt,
      finalRawCompletion: rawCompletion,
      finalRawTotal: rawTotal,
    };
  }

  // Capped at available — scale the raw counts down proportionally so
  // promptTokens/completionTokens stay consistent with what was billed.
  // (Unreachable when tokenMultiplier is 0, since billable is always 0 then.)
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
  const scale = requestedTotal > 0 ? finalBillableTotal / requestedTotal : 0;

  return {
    finalBillablePrompt,
    finalBillableCompletion,
    finalBillableTotal,
    finalRawPrompt: Math.ceil(rawPrompt * scale),
    finalRawCompletion: Math.ceil(rawCompletion * scale),
    finalRawTotal: Math.ceil(rawTotal * scale),
  };
}
