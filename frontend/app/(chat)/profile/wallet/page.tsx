"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { walletService } from "@/lib/services";
import { Loader2, Coins, TrendingUp, Eye } from "lucide-react";
import { DataTable, Column } from "@/components/dashboard/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Transactions state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<any>({});
  const [selectedTx, setSelectedTx] = useState<any>(null);

  useEffect(() => {
    walletService
      .get()
      .then((res) => setWallet(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!wallet) return;
    setTxLoading(true);
    try {
      const params: any = {
        page: String(page),
        pageSize: String(pageSize),
      };
      if (sort) params.sort = sort;

      const res = await walletService.getTransactions(params);
      const result = res.data.data;
      setTransactions(result?.data || []);
      setPagination(result || {});
    } catch {
      // ignore
    } finally {
      setTxLoading(false);
    }
  }, [sort, page, pageSize, wallet]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    setPage(1);
  }, [sort, pageSize]);

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );

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

  const columns: Column[] = [
    {
      key: "referenceId",
      label: "Reference ID",
      render: (r: any) => (
        <span className="font-mono text-xs text-muted-foreground">
          {r.referenceId || "-"}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (r: any) => {
        const isAddition = r.type === "CREDIT";

        return (
          <span
            className={`text-xs uppercase px-2 py-1 rounded-md ${
              isAddition
                ? "text-emerald-500 bg-emerald-500/10"
                : "text-rose-500 bg-rose-500/10"
            }`}
          >
            {r.type.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (r: any) => {
        const isAddition = r.type === "CREDIT";
        const color = isAddition ? "text-emerald-500" : "text-rose-500";
        const sign = isAddition ? "+" : "-";
        return (
          <span className={`font-mono text-sm font-medium ${color}`}>
            {sign}
            {Math.abs(r.amount).toLocaleString()}
          </span>
        );
      },
    },

    {
      key: "createdAt",
      label: "Date",
      sortable: true,
      render: (r) => (
        <span className="text-muted-foreground text-sm">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-12 min-w-[48px] text-center",
      render: (r) => (
        <button
          onClick={() => setSelectedTx(r)}
          className="mx-auto p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer shrink-0"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your token balance and usage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/90 backdrop-blur-sm border-border/30">
          <CardContent className="p-6 text-center">
            <Coins className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-3xl font-bold">
              {wallet.tokensRemaining.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tokens Remaining
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/90 backdrop-blur-sm border-border/30">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-3xl font-bold">
              {wallet.tokensUsed.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Tokens Used</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/30 bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Usage Progress</CardTitle>
          <CardDescription>
            Period:{" "}
            {wallet.currentPeriodStart
              ? new Date(wallet.currentPeriodStart).toLocaleDateString()
              : "N/A"}{" "}
            —{" "}
            {wallet.currentPeriodEnd
              ? new Date(wallet.currentPeriodEnd).toLocaleDateString()
              : "N/A"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Used</span>
              <span className="font-medium">
                {wallet.tokensUsed.toLocaleString()} / {total.toLocaleString()}
              </span>
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

      <DataTable
        columns={columns}
        data={transactions}
        title="Transactions"
        description="History of your token deductions, recharges, and refunds"
        sort={sort}
        onSortChange={setSort}
        page={page}
        pageSize={pageSize}
        totalRecords={pagination.totalRecords || 0}
        totalPages={pagination.totalPages || 1}
        hasNextPage={pagination.hasNextPage}
        hasPreviousPage={pagination.hasPreviousPage}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={txLoading}
      />

      <Dialog
        open={!!selectedTx}
        onOpenChange={(open) => !open && setSelectedTx(null)}
      >
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs uppercase mb-1">
                    Type
                  </span>
                  <span
                    className={`text-xs uppercase px-2 py-1 rounded-md ${
                      selectedTx.type === "CREDIT"
                        ? "text-emerald-500 bg-emerald-500/10"
                        : "text-rose-500 bg-rose-500/10"
                    }`}
                  >
                    {selectedTx.type.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase mb-1">
                    Amount
                  </span>
                  <span
                    className={`font-mono font-medium ${selectedTx.type === "CREDIT" ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    {selectedTx.type === "CREDIT"
                      ? "+"
                      : "-"}
                    {Math.abs(selectedTx.amount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase mb-1">
                    Reference ID
                  </span>
                  <span className="font-mono text-muted-foreground break-all">
                    {selectedTx.referenceId || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase mb-1">
                    Date
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(selectedTx.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedTx.meta && Object.keys(selectedTx.meta).length > 0 && (
                <div className="pt-4 border-t border-border/50">
                  <span className="text-muted-foreground block text-xs uppercase mb-2">
                    Metadata
                  </span>
                  <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40 border border-border/50">
                    {JSON.stringify(selectedTx.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
