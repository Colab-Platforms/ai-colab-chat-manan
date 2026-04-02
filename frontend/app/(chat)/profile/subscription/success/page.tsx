"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { subscriptionService } from "@/lib/services";

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [isFlowAllowed, setIsFlowAllowed] = useState(false);

  useEffect(() => {
    const startedFromCheckout =
      typeof window !== "undefined" &&
      sessionStorage.getItem("subscription_checkout_in_progress") === "1";
    const hasCashfreeParams =
      typeof window !== "undefined" &&
      (() => {
        const params = new URLSearchParams(window.location.search);
        const knownCashfreeKeys = [
          "subscription_id",
          "cf_subscription_id",
          "payment_id",
          "cf_payment_id",
          "order_id",
        ];
        return knownCashfreeKeys.some((key) => params.has(key));
      })();
    const fromCashfreeReferrer =
      typeof document !== "undefined" && /cashfree/i.test(document.referrer || "");
    const canOpenSuccessPage = startedFromCheckout || hasCashfreeParams || fromCashfreeReferrer;

    if (!canOpenSuccessPage) {
      router.replace("/profile/subscription");
      return;
    }

    if (startedFromCheckout) {
      sessionStorage.removeItem("subscription_checkout_in_progress");
    }
    setIsFlowAllowed(true);

    let mounted = true;
    let intervalId: number | null = null;
    const startedAt = Date.now();
    // Match the backend "pending auth" cancellation window so we don't show
    // "Payment is being verified" for longer than the user can be cancelled.
    const POLL_TIMEOUT_MS = 15 * 60_000;
    const POLL_INTERVAL_MS = 2_500;

    const checkCurrentStatus = async () => {
      try {
        const res = await subscriptionService.getCurrent();
        if (!mounted) return;
        const current = res?.data?.data?.subscription;
        const pending = res?.data?.data?.pendingSubscription;
        const activeCurrent = Boolean(current && ["ACTIVE", "TRIAL"].includes(String(current.status)));
        const hasPaidCurrent = Number(current?.plan?.monthlyPrice ?? 0) > 0;
        // Don't show "Successfully subscribed" if there's still a pending paid subscription.
        // This avoids false success when user already has a free/active plan.
        const active = activeCurrent && hasPaidCurrent && !pending;
        setIsActive(active);
        if (active && intervalId) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      } catch {
        if (!mounted) return;
        setIsActive(false);
      } finally {
        if (mounted) setLoading(false);
        if (Date.now() - startedAt > POLL_TIMEOUT_MS && intervalId) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    void checkCurrentStatus();
    intervalId = window.setInterval(() => {
      void checkCurrentStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [router]);

  useEffect(() => {
    if (!isFlowAllowed || !isActive) return;

    let cancelled = false;
    let animationFrame = 0;
    let lastBurstAt = 0;

    const fireFromBottomSides = async () => {
      const confetti = (await import("canvas-confetti")).default;
      const duration = 3500;
      const animationEnd = Date.now() + duration;

      const defaults = {
        startVelocity: 38,
        spread: 65,
        ticks: 140,
        zIndex: 50,
        disableForReducedMotion: true,
      };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const launch = () => {
        confetti({
          ...defaults,
          particleCount: 22,
          angle: randomInRange(55, 75),
          origin: { x: 0.08, y: 0.98 },
        });
        confetti({
          ...defaults,
          particleCount: 22,
          angle: randomInRange(105, 125),
          origin: { x: 0.92, y: 0.98 },
        });
      };

      const frame = () => {
        if (cancelled) return;
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return;
        if (Date.now() - lastBurstAt > 180) {
          launch();
          lastBurstAt = Date.now();
        }
        animationFrame = window.requestAnimationFrame(frame);
      };

      launch();
      animationFrame = window.requestAnimationFrame(frame);
    };

    void fireFromBottomSides();

    return () => {
      cancelled = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [isFlowAllowed, isActive]);

  if (!isFlowAllowed) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-xl border-border/40 bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Payment is being verified</CardTitle>
            <CardDescription>
              We are still waiting for confirmation from the payment gateway. Please don’t refresh or close this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-border/40 bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl">Successfully subscribed</CardTitle>
          <CardDescription>
            Your subscription is active. You can start chatting now or head to your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="sm:min-w-40">
            <Link href="/">Start chat</Link>
          </Button>
          <Button asChild variant="outline" className="sm:min-w-40">
            <Link href="/profile">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
