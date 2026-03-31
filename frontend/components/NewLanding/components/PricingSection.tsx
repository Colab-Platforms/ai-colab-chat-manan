"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { planService } from "@/lib/services";
import { ScrollReveal } from "./ScrollReveal";

// ─────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────
interface PlanTier {
  id: number;
  name: string;
  price: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  isFree?: boolean;
}

// ─────────────────────────────────────────────────────
//  PricingCard — reusable UI card (exported for reuse)
// ─────────────────────────────────────────────────────
export interface PricingCardProps {
  title: string;
  /** Pre-formatted price string, e.g. "₹999/month" or "Free" */
  price: string;
  description?: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  /** True when this is the free plan (free only for the 1st month) */
  isFreeFirstMonth?: boolean;
  delay?: number;
}

export function PricingCard({
  title,
  price,
  description,
  features,
  cta,
  href,
  featured = false,
  isFreeFirstMonth = false,
  delay = 0,
}: PricingCardProps) {
  return (
    <ScrollReveal delay={delay} className="h-full">
      <div
        className={cn(
          "relative flex flex-col h-full rounded-2xl border p-7 text-left transition-all duration-300",
          "bg-white/60 dark:bg-[#0f0208]/60 backdrop-blur-sm",
          featured
            ? "border-pink-300 dark:border-pink-700/70 shadow-xl shadow-pink-200/30 dark:shadow-pink-900/20 scale-[1.03] z-10"
            : "border-gray-100 dark:border-pink-950/40 hover:border-pink-200 dark:hover:border-pink-900/50 hover:shadow-lg hover:shadow-pink-100/30 dark:hover:shadow-pink-900/10"
        )}
        aria-label={`${title} plan`}
      >
        {/* Most Popular ribbon */}
        {featured && (
          <div className="absolute -top-3.5 inset-x-0 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#861043] px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md shadow-pink-400/30">
              <Sparkles className="h-3 w-3" />
              Most Popular
            </span>
          </div>
        )}

        {/* Plan name badge */}
        <div className="flex items-center gap-2 mt-2">
          <Badge
            variant={featured ? "default" : "secondary"}
            className={cn(
              "rounded-md uppercase tracking-wider text-[11px] font-semibold",
              featured &&
                "bg-pink-100 dark:bg-pink-950/60 text-[#861043] dark:text-pink-400 border-pink-200 dark:border-pink-800"
            )}
          >
            {title}
          </Badge>
        </div>

        {/* Price */}
        <h3
          className={cn(
            "mt-5 text-4xl font-bold tracking-tight",
            featured
              ? "text-[#861043] dark:text-pink-400"
              : "text-pink-900 dark:text-pink-200"
          )}
        >
          {price}
        </h3>

        {/* "Free for 1st month" notice */}
        {/* {isFreeFirstMonth && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/50 px-3 py-1 w-fit">
            <Gift className="h-3.5 w-3.5 text-[#861043] dark:text-pink-400" />
            <span className="text-[11px] font-semibold text-[#861043] dark:text-pink-400">
              Free for your first month
            </span>
          </div>
        )} */}

        {/* Description */}
        {description && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 min-h-[40px] leading-relaxed">
            {description}
          </p>
        )}

        {/* Divider */}
        <div className="my-6 border-t border-gray-100 dark:border-pink-950/40" />

        {/* Features list */}
        <ul className="space-y-3 mb-8 grow">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start text-sm text-gray-700 dark:text-gray-300"
            >
              <CircleCheck
                className={cn(
                  "mr-3 mt-0.5 h-4 w-4 shrink-0",
                  featured
                    ? "text-[#861043] dark:text-pink-400"
                    : "text-pink-400 dark:text-pink-600"
                )}
                aria-hidden
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-auto">
          <Link href={href}>
            <Button
              size="lg"
              className={cn(
                "w-full font-semibold transition-all",
                featured
                  ? "bg-[#861043] hover:bg-[#6d0d37] text-white shadow-md shadow-pink-400/20"
                  : "border border-pink-200 dark:border-pink-900/50 text-[#861043] dark:text-pink-400 bg-transparent hover:bg-pink-50 dark:hover:bg-pink-950/30"
              )}
              variant={featured ? "default" : "outline"}
            >
              {cta}
            </Button>
          </Link>
        </div>
      </div>
    </ScrollReveal>
  );
}

// ─────────────────────────────────────────────────────
//  PricingSection — full section with header + cards
// ─────────────────────────────────────────────────────
export function PricingSection() {
  const [plans, setPlans] = React.useState<PlanTier[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [plansError, setPlansError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansError(null);
        const response = await planService.list({
          page: "1",
          pageSize: "100",
        });
        if (!response.data.status) {
          setPlans([]);
          setPlansError("Our plans are being refreshed right now. Check back in a moment.");
          return;
        }

        const outer = response.data.data;
        const planList: any[] = Array.isArray(outer)
          ? outer
          : Array.isArray(outer?.data)
          ? outer.data
          : outer?.records ?? [];

        const parsed = planList
          .filter((plan: any) => plan.isActive && !plan.isDeleted)
          .sort(
            (a: any, b: any) =>
              Number(a.monthlyPrice) - Number(b.monthlyPrice)
          )
          .map((plan: any) => {
            const features: string[] = [];

            if (
              plan.features &&
              typeof plan.features === "object" &&
              !Array.isArray(plan.features)
            ) {
              if (plan.features.maxModels === -1)
                features.push("Unlimited AI Models");
              else if (plan.features.maxModels)
                features.push(`${plan.features.maxModels} AI Models`);

              if (plan.features.attachments)
                features.push("File Uploads & Attachments");

              if (plan.features.support) {
                const raw = plan.features.support as string;
                // "priority_plus" → "Priority Plus Support"
                const label = raw
                  .split("_")
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ");
                features.push(`${label} Support`);
              }
            } else if (Array.isArray(plan.features)) {
              features.push(...plan.features);
            }

            if (plan.tokenLimit)
              features.push(
                `${Number(plan.tokenLimit).toLocaleString("en-IN")} monthly tokens`
              );

            if (features.length === 0) features.push(`Everything in ${plan.name}`);

            const isFree = Number(plan.monthlyPrice) === 0;

            return {
              id: plan.id,
              name: plan.name,
              price: Number(plan.monthlyPrice),
              description:
                plan.description ||
                (isFree
                  ? "Get started at no cost for your first month."
                  : `Ideal for ${plan.name} users.`),
              features,
              isPopular: plan.name.toLowerCase() === "pro",
              isFree,
            };
          });

        if (parsed.length === 0) {
          setPlans([]);
          setPlansError("No active plans are available at the moment.");
          return;
        }

        setPlans(parsed);
      } catch (err) {
        console.error("Error fetching pricing plans:", err);
        setPlans([]);
        setPlansError("Our plans are being refreshed right now. Check back in a moment.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const formatPrice = (price: number): string => {
    if (price === 0) return "Free";
    return `₹${price.toLocaleString("en-IN")}/mo`;
  };

  return (
    <section id="pricing" className="py-24 bg-[#fdf6f9] dark:bg-[#060104]">
      <div className="container mx-auto px-6">

        {/* ── Section header — same ScrollReveal pattern as Testimonials & FAQ ── */}
        <ScrollReveal
          delay={0.1}
          className="flex flex-col items-center text-center max-w-4xl mx-auto mb-14"
        >
          <span className="border border-pink-200 dark:border-pink-900/60 text-pink-700 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 py-1 px-4 rounded-full text-xs font-medium tracking-wide mb-5">
            Plans & Pricing
          </span>
          <h2 className="text-4xl max-md:text-3xl font-bold text-pink-900 dark:text-pink-200 tracking-tight">
            Invest in intelligence. Simple, transparent pricing
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-balance">
            Start free for your first month — no credit card needed. Upgrade
            when you&rsquo;re ready and unlock the full power of 15+ AI models,
            rolling context, and team collaboration.
          </p>
        </ScrollReveal>

        {/* ── Cards ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[320px] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading plans…
            </p>
          </div>
        ) : plansError ? (
          <div className="flex items-center justify-center min-h-[220px]">
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
              {plansError}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {plans.map((plan, i) => (
              <PricingCard
                key={plan.id}
                delay={0.15 + i * 0.1}
                title={plan.name}
                price={formatPrice(plan.price)}
                description={plan.description}
                features={plan.features}
                isFreeFirstMonth={plan.isFree}
                cta={
                  plan.isFree
                    ? "Start Free"
                    : plan.isPopular
                    ? "Get Started — Pro"
                    : `Choose ${plan.name}`
                }
                href={`/checkout?planId=${plan.id}`}
                featured={plan.isPopular}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
