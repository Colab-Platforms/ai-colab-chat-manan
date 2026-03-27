"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { subscriptionService } from "@/lib/services";

const leftConfetti = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: 6 + i * 3.4,
  delay: (i % 6) * 0.18,
  duration: 2.2 + (i % 4) * 0.3,
}));

const rightConfetti = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  right: 6 + i * 3.4,
  delay: (i % 6) * 0.2,
  duration: 2.1 + (i % 5) * 0.25,
}));

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [isFlowAllowed, setIsFlowAllowed] = useState(false);

  useEffect(() => {
    const startedFromCheckout =
      typeof window !== "undefined" &&
      sessionStorage.getItem("subscription_checkout_in_progress") === "1";
    if (!startedFromCheckout) {
      router.replace("/profile/subscription");
      return;
    }

    sessionStorage.removeItem("subscription_checkout_in_progress");
    setIsFlowAllowed(true);

    let mounted = true;
    subscriptionService
      .getCurrent()
      .then((res) => {
        if (!mounted) return;
        const current = res?.data?.data?.subscription;
        setIsActive(Boolean(current && ["ACTIVE", "TRIAL"].includes(String(current.status))));
      })
      .catch(() => {
        if (!mounted) return;
        setIsActive(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [router]);

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
              We are still waiting for confirmation from the payment gateway. You can continue or cancel from subscription page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/profile/subscription">Back to subscription</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl min-h-[70vh] flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 bottom-0 w-56 h-56">
          {leftConfetti.map((item) => (
            <span
              key={`l-${item.id}`}
              className="absolute bottom-0 block h-2.5 w-2.5 rounded-sm bg-primary/80"
              style={{
                left: `${item.left}%`,
                animation: `confetti-left ${item.duration}s ease-out ${item.delay}s infinite`,
              }}
            />
          ))}
        </div>
        <div className="absolute right-0 bottom-0 w-56 h-56">
          {rightConfetti.map((item) => (
            <span
              key={`r-${item.id}`}
              className="absolute bottom-0 block h-2.5 w-2.5 rounded-sm bg-emerald-400/80"
              style={{
                right: `${item.right}%`,
                animation: `confetti-right ${item.duration}s ease-out ${item.delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

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

      <style jsx>{`
        @keyframes confetti-left {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          100% {
            transform: translate(80px, -220px) rotate(480deg);
            opacity: 0;
          }
        }
        @keyframes confetti-right {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          100% {
            transform: translate(-80px, -220px) rotate(-480deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
