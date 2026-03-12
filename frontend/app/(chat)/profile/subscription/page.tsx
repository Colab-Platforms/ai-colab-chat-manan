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
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [subRes, planRes] = await Promise.all([
        subscriptionService.getCurrent().catch(() => null),
        planService.list(),
      ]);
      setSubscription(subRes?.data.data || null);
      setPlans(planRes.data.data?.data || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await subscriptionService.cancel();
      toast.success("Subscription cancelled");
      fetchData();
    } catch { toast.error("Failed to cancel"); } finally {
      setCancelling(false);
    }
  };

  const handleSubscribe = async (planId: number) => {
    try {
      await subscriptionService.create({ planId, billingCycle: "MONTHLY" });
      toast.success("Subscribed successfully!");
      fetchData();
    } catch { toast.error("Failed to subscribe"); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your plan and billing</p>
      </div>

      {subscription && (
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
            <p className="text-sm text-muted-foreground">
              Expires: {new Date(subscription.expiresAt).toLocaleDateString()}
            </p>
            {subscription.status === "ACTIVE" && (
              <Button variant="destructive" size="sm" onClick={handleCancel} disabled>
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel subscription"}
              </Button>
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
                    {plan.monthlyPrice === 0 ? "Free" : `$${plan.monthlyPrice}/mo`}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>🎯 {(plan.tokenLimit / 1000).toFixed(0)}k tokens / month</p>
                  <p>🤖 {plan.features?.maxModels === -1 ? "Unlimited" : plan.features?.maxModels} model{plan.features?.maxModels !== 1 ? "s" : ""}</p>
                  {plan.features?.attachments && <p>📎 File attachments</p>}
                </div>
                {(!subscription || subscription.planId !== plan.id) ? (
                  <Button size="sm" className="w-full" onClick={() => handleSubscribe(plan.id)} disabled>
                    {plan.monthlyPrice === 0 ? "Start Free" : "Subscribe"}
                  </Button>
                ) : (
                  <Badge className="w-full justify-center">Current plan</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
