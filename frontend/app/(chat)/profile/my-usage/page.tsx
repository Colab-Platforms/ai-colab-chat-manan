"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { DataTable, Column } from "@/components/dashboard/data-table";
import { usageLogService } from "@/lib/services";

export default function UsagePage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<any>({});

  const fetchLogs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params: any = { 
        page: String(page), 
        pageSize: String(pageSize),
        userId: String(user.id) // Always filter by the current logged in user
      };
      if (sort) params.sort = sort;
      const res = await usageLogService.list(params);
      const result = res.data.data;
      setLogs(result?.data || []);
      setPagination(result || {});
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [sort, page, pageSize, user?.id]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [sort, pageSize]);

  const columns: Column[] = [
    { key: "model", label: "Model", render: (r) => r.model?.name || "Unknown" },
    { key: "capability", label: "Capability", render: (r) => <span className="text-xs uppercase text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">{r.capability?.replace(/_/g, " ") || "STANDARD"}</span> },
    { key: "promptTokens", label: "Prompt", sortable: true, className: "text-right", render: (r) => <span className="font-mono text-xs">{r.billablePromptTokens?.toLocaleString() || 0}</span> },
    { key: "completionTokens", label: "Completion", sortable: true, className: "text-right", render: (r) => <span className="font-mono text-xs">{r.billableCompletionTokens?.toLocaleString() || 0}</span> },
    { key: "totalTokens", label: "Total", sortable: true, className: "text-right", render: (r) => <span className="font-mono text-xs font-medium">{r.billableTotalTokens?.toLocaleString() || 0}</span> },
    { key: "createdAt", label: "Date", sortable: true, render: (r) => <span className="text-muted-foreground text-sm">{new Date(r.createdAt).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={logs}
        title="My Usage"
        description="Your token usage history"
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
        loading={loading}
      />
    </div>
  );
}
