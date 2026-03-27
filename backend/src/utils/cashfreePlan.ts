import { createHash } from "crypto";

export type BillingCycle = "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface CashfreePlanSource {
  id: number;
  name: string;
  monthlyPrice: unknown;
  quarterlyPrice: unknown;
  yearlyPrice: unknown;
  tokenLimit: number;
}

export function toPaise(amount: unknown): number {
  return Math.round(Number(amount) * 100);
}

function normalizeInrAmount(amount: unknown): number {
  return Number(Number(amount).toFixed(2));
}

function getCycleAmount(plan: CashfreePlanSource, billingCycle: BillingCycle): unknown {
  switch (billingCycle) {
    case "MONTHLY":
      return plan.monthlyPrice;
    case "QUARTERLY":
      return plan.quarterlyPrice;
    case "YEARLY":
      return plan.yearlyPrice;
  }
}

export function getCashfreePlanId(
  plan: CashfreePlanSource,
  billingCycle: BillingCycle,
): string {
  const raw = `${plan.id}|${billingCycle}|${String(getCycleAmount(plan, billingCycle))}|${plan.tokenLimit}`;
  const hash = createHash("sha1").update(raw).digest("hex").slice(0, 12);
  return `pl_${plan.id}_${billingCycle.toLowerCase()}_${hash}`.slice(0, 40);
}

export function getCashfreePlanRecurringAmountPaise(
  plan: CashfreePlanSource,
  billingCycle: BillingCycle,
): number {
  // NOTE: despite historical name, Cashfree PG plan APIs expect INR amount units
  // (same as subscription create payload), not paise.
  return normalizeInrAmount(getCycleAmount(plan, billingCycle));
}

export function getCashfreePlanIntervalType(
  billingCycle: BillingCycle,
): "MONTH" | "YEAR" {
  switch (billingCycle) {
    case "MONTHLY":
      return "MONTH";
    case "QUARTERLY":
      // Cashfree periodic plans support MONTH with intervals=3 for quarterly cadence.
      return "MONTH";
    case "YEARLY":
      return "YEAR";
  }
}

export function getCashfreePlanIntervals(
  billingCycle: BillingCycle,
): number {
  return billingCycle === "QUARTERLY" ? 3 : 1;
}

