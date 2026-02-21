export interface CreateSubscriptionBody {
    planId: number;
    billingCycle: "MONTHLY" | "QUARTERLY" | "YEARLY";
}
