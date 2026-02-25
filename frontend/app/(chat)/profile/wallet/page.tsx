"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { walletService } from "@/lib/services";
import { Loader2, Coins, TrendingUp } from "lucide-react";

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    walletService.get()
      .then((res) => setWallet(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  if (!wallet) {
    return (
      <Card className="border-border/30 bg-card/90 backdrop-blur-sm">
        <CardContent className="py-12 text-center text-muted-foreground">
          No wallet found. Subscribe to a plan first.
        </CardContent>
      </Card>
    );
  }

  const total = wallet.tokensRemaining + wallet.tokensUsed;
  const usagePercent = total > 0 ? (wallet.tokensUsed / total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your token balance and usage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/90 backdrop-blur-sm border-border/30">
          <CardContent className="p-6 text-center">
            <Coins className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-3xl font-bold">{wallet.tokensRemaining.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Tokens Remaining</p>
          </CardContent>
        </Card>
        <Card className="bg-card/90 backdrop-blur-sm border-border/30">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-3xl font-bold">{wallet.tokensUsed.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Tokens Used</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/30 bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Usage Progress</CardTitle>
          <CardDescription>
            Period: {wallet.currentPeriodStart ? new Date(wallet.currentPeriodStart).toLocaleDateString() : "N/A"} — {wallet.currentPeriodEnd ? new Date(wallet.currentPeriodEnd).toLocaleDateString() : "N/A"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Used</span>
              <span className="font-medium">{wallet.tokensUsed.toLocaleString()} / {total.toLocaleString()}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{usagePercent.toFixed(1)}% used</span>
              <span>{wallet.tokensRemaining.toLocaleString()} remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
