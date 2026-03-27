export interface CreateSubscriptionBody {
    planId: number;
    billingCycle: "MONTHLY" | "QUARTERLY" | "YEARLY";
    forceRetry?: boolean;
}

export type BillingCycle = "MONTHLY" | "QUARTERLY" | "YEARLY";