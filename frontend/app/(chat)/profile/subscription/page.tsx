"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { subscriptionService, planService } from "@/lib/services";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [pendingSubscription, setPendingSubscription] = useState<any>(null);
  const [freePlanTaken, setFreePlanTaken] = useState(false);
  const [pendingExpiresAt, setPendingExpiresAt] = useState<string | null>(null);
  const [pendingAuthLink, setPendingAuthLink] = useState<string | null>(null);
  const [pendingSubscriptionSessionId, setPendingSubscriptionSessionId] = useState<string | null>(null);
  const [pendingCountdownMs, setPendingCountdownMs] = useState<number | null>(null);
  const [autoCancellingPending, setAutoCancellingPending] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [cancellingPendingPayment, setCancellingPendingPayment] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<number | null>(null);
  const isUsableAuthLink = (url: string | null | undefined) =>
    Boolean(url) && !String(url).includes("/subscriptions/checkout/timer");
  const markCheckoutFlowStart = () => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("subscription_checkout_in_progress", "1");
  };

  const loadCashfreeSdk = async () => {
    if (typeof window === "undefined") return null;
    if ((window as any).Cashfree) return (window as any).Cashfree;

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-cashfree-sdk="true"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Cashfree SDK failed to load")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.setAttribute("data-cashfree-sdk", "true");
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Cashfree SDK failed to load"));
      document.head.appendChild(script);
    });

    return (window as any).Cashfree ?? null;
  };

  const openSubscriptionCheckout = async (sessionId: string) => {
    const Cashfree = await loadCashfreeSdk();
    if (!Cashfree) {
      toast.error("Failed to load Cashfree checkout");
      return;
    }

    const mode = String(process.env.NEXT_PUBLIC_CASHFREE_MODE || "production").toLowerCase() === "sandbox"
      ? "sandbox"
      : "production";
    const cashfree = Cashfree({ mode });
    const result = await cashfree.subscriptionsCheckout({
      subsSessionId: sessionId,
      // Keep checkout in same tab so browser back returns here.
      redirectTarget: "_self",
    });

    if (result?.error) {
      toast.error(result.error?.message || "Failed to open payment checkout");
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [subRes, planRes] = await Promise.all([
        subscriptionService.getCurrent().catch(() => null),
        planService.list(),
      ]);
      console.debug("[SubscriptionPage] fetchData responses", {
        subRes: subRes?.data,
        planCount: planRes?.data?.data?.data?.length ?? 0,
      });
      const subData = subRes?.data?.data;
      if (subData && typeof subData === "object" && "subscription" in subData) {
        setSubscription((subData as any).subscription ?? null);
        setPendingSubscription((subData as any).pendingSubscription ?? null);
        setFreePlanTaken(Boolean((subData as any).freePlanTaken));
        setPendingExpiresAt((subData as any).pendingExpiresAt ?? null);
        setPendingSubscriptionSessionId((subData as any).pendingSubscriptionSessionId ?? null);
        if ((subData as any).pendingAuthLink && isUsableAuthLink((subData as any).pendingAuthLink)) {
          setPendingAuthLink((subData as any).pendingAuthLink);
          if (typeof window !== "undefined") {
            localStorage.setItem("pending_subscription_auth_link", (subData as any).pendingAuthLink);
          }
        } else if (typeof window !== "undefined") {
          localStorage.removeItem("pending_subscription_auth_link");
          setPendingAuthLink(null);
        }
      } else {
        setSubscription(subData ?? null);
        setPendingSubscription(null);
        setFreePlanTaken(false);
        setPendingExpiresAt(null);
        setPendingSubscriptionSessionId(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("pending_subscription_auth_link");
          setPendingAuthLink(null);
        }
      }
      setPlans(planRes.data.data?.data || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!pendingExpiresAt) {
      setPendingCountdownMs(null);
      return;
    }

    const updateCountdown = () => {
      const expiresMs = new Date(pendingExpiresAt).getTime();
      const remaining = Math.max(0, expiresMs - Date.now());
      setPendingCountdownMs(remaining);
    };

    updateCountdown();
    const id = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(id);
  }, [pendingExpiresAt]);

  useEffect(() => {
    if (!pendingSubscription || pendingCountdownMs === null || pendingCountdownMs > 0 || autoCancellingPending) return;

    const autoCancelExpiredPending = async () => {
      setAutoCancellingPending(true);
      try {
        await subscriptionService.cancel();
        if (typeof window !== "undefined") {
          localStorage.removeItem("pending_subscription_auth_link");
        }
        setPendingAuthLink(null);
        toast.info("Pending payment expired and was auto-cancelled.");
        await fetchData();
      } catch {
        // Backend also expires old pending subscriptions on /current.
        await fetchData();
      } finally {
        setAutoCancellingPending(false);
      }
    };

    void autoCancelExpiredPending();
  }, [pendingSubscription, pendingCountdownMs, autoCancellingPending, fetchData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("pending_subscription_auth_link");
    if (isUsableAuthLink(stored)) {
      setPendingAuthLink(stored);
    } else {
      localStorage.removeItem("pending_subscription_auth_link");
      setPendingAuthLink(null);
    }
  }, []);

  const handleCancel = async () => {
    if (cancellingSubscription) return;
    setCancellingSubscription(true);
    try {
      await subscriptionService.cancel();
      toast.success("Subscription cancelled");
      fetchData();
    } catch { toast.error("Failed to cancel"); } finally {
      setCancellingSubscription(false);
    }
  };

  const handleSubscribe = async (planId: number) => {
    if (subscribingPlanId !== null) return;
    setSubscribingPlanId(planId);
    try {
      console.debug("[SubscriptionPage] handleSubscribe request", { planId });
      const res = await subscriptionService.create({
        planId,
        billingCycle: "MONTHLY",
      });
      console.debug("[SubscriptionPage] handleSubscribe response", res?.data);

      const auth_link = res?.data?.data?.auth_link;
      const subscriptionSessionId = res?.data?.data?.subscription_session_id;
      const selectedPlan = plans.find((p: any) => p.id === planId);
      const isPaidPlan = Number(selectedPlan?.monthlyPrice ?? 0) > 0;

      if (isPaidPlan && subscriptionSessionId) {
        markCheckoutFlowStart();
        if (typeof window !== "undefined") {
          localStorage.removeItem("pending_subscription_auth_link");
          setPendingAuthLink(null);
        }
        await openSubscriptionCheckout(subscriptionSessionId);
        await fetchData();
        return;
      }

      if (isUsableAuthLink(auth_link)) {
        console.debug("[SubscriptionPage] redirecting with auth_link", { auth_link });
        markCheckoutFlowStart();
        if (typeof window !== "undefined") {
          localStorage.setItem("pending_subscription_auth_link", auth_link);
          setPendingAuthLink(auth_link);
        }
        toast.success("Redirecting to Cashfree authorization...");
        window.location.href = auth_link;
        return;
      }

      if (isPaidPlan) {
        console.debug("[SubscriptionPage] paid plan but no auth_link", { planId, isPaidPlan });
        toast.info("Subscription initiated. Use Continue payment to complete authorization.");
        await fetchData();
        return;
      }

      // Free plan activates immediately (no Cashfree redirect).
      if (typeof window !== "undefined") {
        localStorage.removeItem("pending_subscription_auth_link");
        setPendingAuthLink(null);
      }
      toast.success("Subscribed successfully!");
      fetchData();
    } catch (err: any) {
      console.debug("[SubscriptionPage] handleSubscribe error", err?.response?.data || err);
      toast.error(err?.response?.data?.message || "Failed to subscribe");
    }
    finally {
      setSubscribingPlanId(null);
    }
  };

  const handleContinuePending = () => {
    console.debug("[SubscriptionPage] handleContinuePending", {
      pendingAuthLink,
      hasLink: Boolean(pendingAuthLink),
    });
    if (pendingSubscriptionSessionId) {
      markCheckoutFlowStart();
      void openSubscriptionCheckout(pendingSubscriptionSessionId);
      return;
    }
    if (!isUsableAuthLink(pendingAuthLink)) {
      toast.error("No valid pending payment link found");
      return;
    }
    markCheckoutFlowStart();
    window.location.href = pendingAuthLink as string;
  };

  const handleCancelOlderPayment = async () => {
    if (cancellingPendingPayment || autoCancellingPending) return;
    setCancellingPendingPayment(true);
    try {
      await subscriptionService.cancel();
      if (typeof window !== "undefined") {
        localStorage.removeItem("pending_subscription_auth_link");
      }
      setPendingAuthLink(null);
      toast.success("Older pending payment cancelled");
      await fetchData();
    } catch (err: any) {
      console.debug("[SubscriptionPage] handleCancelOlderPayment error", err?.response?.data || err);
      toast.error(err?.response?.data?.message || "Failed to cancel pending payment");
    } finally {
      setCancellingPendingPayment(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const pendingCountdownLabel = (() => {
    if (pendingCountdownMs === null) return null;
    const totalSeconds = Math.max(0, Math.floor(pendingCountdownMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your plan and billing</p>
      </div>

      {subscription ? (
        <Card className="bg-card/90 backdrop-blur-sm border-border/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{subscription.plan?.name} Plan</CardTitle>
                <CardDescription>{subscription.billingCycle} billing</CardDescription>
              </div>
              <Badge variant={subscription.status === "ACTIVE" ? "default" : "secondary"}>
                {subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription.expiresAt && (
              <p className="text-sm text-muted-foreground">
                Expires: {new Date(subscription.expiresAt).toLocaleDateString()}
              </p>
            )}
            {subscription.status === "ACTIVE" && (
              <Button variant="destructive" size="sm" onClick={handleCancel} disabled={cancellingSubscription}>
                {cancellingSubscription ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel subscription"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/90 backdrop-blur-sm border-border/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No active plans</p>
          </CardContent>
        </Card>
      )}

      {pendingSubscription && (
        <Card className="bg-card/90 backdrop-blur-sm border-border/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{pendingSubscription.plan?.name} Plan</CardTitle>
                <CardDescription>{pendingSubscription.billingCycle} billing</CardDescription>
              </div>
              <Badge variant="secondary">PENDING</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Payment authorization pending
              </p>
              <p className="text-xs text-amber-700/90 dark:text-amber-300/90 mt-0.5">
                A ₹2 mandate auth debit may be made and refunded. Your actual plan amount is charged right after authorization.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleContinuePending}
                disabled={subscribingPlanId !== null}
              >
                Continue payment
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancelOlderPayment}
                disabled={cancellingPendingPayment || autoCancellingPending}
              >
                {cancellingPendingPayment || autoCancellingPending ? "Cancelling..." : "Cancel payment"}
              </Button>
            </div>
            {pendingExpiresAt && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/25 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Expires around {new Date(pendingExpiresAt).toLocaleString()}
                </p>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {pendingCountdownLabel ?? "--:--"} left
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/30 bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Available Plans</CardTitle>
          <CardDescription>Choose the plan that works for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan: any) => (
              <div key={plan.id} className="border border-border/40 rounded-xl p-5 space-y-3 bg-card/80 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    {plan.monthlyPrice === 0 ? "Free" : `₹${plan.monthlyPrice}/mo`}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>🎯 {(plan.tokenLimit / 1000).toFixed(0)}k tokens / month</p>
                  <p>🤖 {plan.features?.maxModels === -1 ? "Unlimited" : plan.features?.maxModels} model{plan.features?.maxModels !== 1 ? "s" : ""}</p>
                  {plan.features?.attachments && <p>📎 File attachments</p>}
                </div>
                {(() => {
                  const isCurrentPlan = !!subscription && subscription.planId === plan.id;
                  const isFreePlan = Number(plan.monthlyPrice) === 0;
                  const isAlreadyTakenFree = isFreePlan && freePlanTaken && !isCurrentPlan;
                  const currentMonthlyPrice = Number(subscription?.plan?.monthlyPrice ?? 0);
                  const planMonthlyPrice = Number(plan.monthlyPrice ?? 0);
                  const hasCurrentPlan = Boolean(subscription);
                  const isUpgrade = hasCurrentPlan && planMonthlyPrice > currentMonthlyPrice;

                  if (isCurrentPlan) {
                    return <Badge className="w-full justify-center">Current plan</Badge>;
                  }

                  if (isAlreadyTakenFree) {
                    return <Badge variant="secondary" className="w-full justify-center">Already taken</Badge>;
                  }

                  return (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleSubscribe(plan.id)}
                    >
                      {subscribingPlanId === plan.id
                        ? "Starting..."
                        : isFreePlan
                          ? "Start Free"
                          : isUpgrade
                            ? "Upgrade"
                            : hasCurrentPlan
                              ? "Change plan"
                              : "Subscribe"}
                    </Button>
                  );
                })()}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
