"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { walletService, subscriptionService } from "@/lib/services";
import { Wallet, CreditCard, Coins, TrendingUp, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      walletService.get().catch(() => null),
      subscriptionService.getCurrent().catch(() => null),
    ]).then(([w, s]) => {
      setWallet(w?.data?.data || null);
      setSubscription(s?.data?.data || null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const total = wallet ? wallet.tokensRemaining + wallet.tokensUsed : 0;
  const usagePercent = total > 0 ? (wallet.tokensUsed / total) * 100 : 0;

  const stats = [
    {
      label: "Tokens Remaining",
      value: wallet?.tokensRemaining?.toLocaleString() || "0",
      icon: Coins,
      gradient: "from-emerald-500/20 to-teal-500/10",
      iconColor: "text-emerald-500",
    },
    {
      label: "Tokens Used",
      value: wallet?.tokensUsed?.toLocaleString() || "0",
      icon: TrendingUp,
      gradient: "from-blue-500/20 to-indigo-500/10",
      iconColor: "text-blue-500",
    },
    {
      label: "Current Plan",
      value: subscription?.plan?.name || "None",
      icon: CreditCard,
      gradient: "from-purple-500/20 to-pink-500/10",
      iconColor: "text-purple-500",
    },
    {
      label: "Wallet Balance",
      value: `${usagePercent.toFixed(1)}% used`,
      icon: Wallet,
      gradient: "from-amber-500/20 to-orange-500/10",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{user?.firstName}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Here&apos;s your account overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className={`bg-card/90 backdrop-blur-sm border-border/30 shadow-sm hover:shadow-md transition-shadow overflow-hidden`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1.5">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center ${stat.iconColor}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage bar */}
      {wallet && (
        <Card className="border-border/30 bg-card/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-3">Token Usage</h3>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{wallet.tokensUsed.toLocaleString()} used</span>
              <span>{wallet.tokensRemaining.toLocaleString()} remaining</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
