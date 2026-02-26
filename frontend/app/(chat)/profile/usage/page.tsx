"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { DataTable, Column } from "@/components/dashboard/data-table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { usageLogService } from "@/lib/services";

export default function AdminUsagePage() {
  const { hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<any>({});
  
  // Search handled natively by DataTable with debounce
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !hasRole("ADMIN") && !hasRole("SUPERADMIN")) {
      router.replace("/profile");
    }
  }, [hasRole, authLoading, router]);

  const fetchLogs = useCallback(async () => {
    if (authLoading || (!hasRole("ADMIN") && !hasRole("SUPERADMIN"))) return;
    
    setLoading(true);
    try {
      const params: any = { 
        page: String(page), 
        pageSize: String(pageSize),
      };
      
      if (sort) params.sort = sort;
      
      // If there's a search term, the backend usage-log service needs `userId`.
      // Note: The ideal approach is to have a robust `search` param in the usage log backend
      // that joins on user name/email, OR allowing filtering by a specific user.
      // Since `buildPrismaQuery` in `usageLogService` supports `userId`, we might need 
      // a global search param across all logs. Let's send `search` if it's supported,
      // or we just send it as a search term and hope the backend handles it.
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      
      const res = await usageLogService.list(params);
      const result = res.data.data;
      setLogs(result?.data || []);
      setPagination(result || {});
    } catch { 
      /* ignore */ 
    } finally { 
      setLoading(false); 
    }
  }, [sort, page, pageSize, debouncedSearch, authLoading, hasRole]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [sort, pageSize, debouncedSearch]);

  const columns: Column[] = [
    { key: "user", label: "User", render: (r: any) => <span className="font-medium">{r.user?.firstName} {r.user?.lastName}<br/><span className="text-xs text-muted-foreground font-normal">{r.user?.email}</span></span> },
    { key: "model", label: "Model", render: (r) => r.model?.name || "Unknown" },
    { key: "capability", label: "Capability", render: (r) => <span className="text-xs uppercase text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">{r.capability?.replace(/_/g, " ") || "STANDARD"}</span> },
    { key: "promptTokens", label: "Prompt", sortable: true, className: "text-right", render: (r) => <span className="font-mono text-xs">{r.promptTokens?.toLocaleString() || 0}</span> },
    { key: "completionTokens", label: "Completion", sortable: true, className: "text-right", render: (r) => <span className="font-mono text-xs">{r.completionTokens?.toLocaleString() || 0}</span> },
    { key: "totalTokens", label: "Total", sortable: true, className: "text-right", render: (r) => <span className="font-mono text-xs font-medium">{r.totalTokens?.toLocaleString() || 0}</span> },
    { key: "createdAt", label: "Date", sortable: true, render: (r) => <span className="text-muted-foreground text-sm">{new Date(r.createdAt).toLocaleString()}</span> },
  ];

  if (authLoading || (!hasRole("ADMIN") && !hasRole("SUPERADMIN"))) {
    return <div className="p-8 flex justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={logs}
        title="Token Usage"
        description="Token usage across all users"
        search={debouncedSearch}
        onSearchChange={setDebouncedSearch}
        searchPlaceholder="Filter by user (name or email)..."
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
