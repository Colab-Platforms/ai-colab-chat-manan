"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/dashboard/data-table";
import { usageLogService } from "@/lib/services";

export default function UsagePage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN") || hasRole("SUPER_ADMIN");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<any>({});

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: String(page), pageSize: String(pageSize) };
      if (sort) params.sort = sort;
      const res = await usageLogService.list(params);
      const result = res.data.data;
      setLogs(result?.data || []);
      setPagination(result || {});
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [sort, page, pageSize]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [sort, pageSize]);

  const columns: Column[] = [
    ...(isAdmin ? [{ key: "user", label: "User", render: (r: any) => <span className="font-medium">{r.user?.firstName} {r.user?.lastName}</span> }] : []),
    { key: "model", label: "Model", render: (r) => r.model?.name },
    { key: "promptTokens", label: "Prompt", sortable: true, className: "text-right", render: (r) => <span className="font-mono text-xs">{r.promptTokens?.toLocaleString()}</span> },
    { key: "completionTokens", label: "Completion", sortable: true, className: "text-right", render: (r) => <span className="font-mono text-xs">{r.completionTokens?.toLocaleString()}</span> },
    { key: "totalTokens", label: "Total", sortable: true, className: "text-right", render: (r) => <span className="font-mono text-xs font-medium">{r.totalTokens?.toLocaleString()}</span> },
    { key: "createdAt", label: "Date", sortable: true, render: (r) => <span className="text-muted-foreground text-sm">{new Date(r.createdAt).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={logs}
        title="Usage"
        description={isAdmin ? "Token usage across all users" : "Your token usage history"}
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
      />
    </div>
  );
}
