"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, SlidersHorizontal, X,
} from "lucide-react";

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface FilterOption {
  key: string;
  label: string;
  type: "boolean" | "select";
  options?: { label: string; value: string }[];
}

interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  search?: string;
  onSearchChange?: (v: string) => void;
  sort?: string;
  onSortChange?: (v: string) => void;
  // Pagination
  page?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  // Actions
  headerActions?: React.ReactNode;
  // Filters
  filters?: FilterOption[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
}

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  title,
  description,
  searchPlaceholder = "Search...",
  search: externalSearch,
  onSearchChange,
  sort,
  onSortChange,
  page = 1,
  pageSize = 10,
  totalRecords = 0,
  totalPages = 1,
  hasNextPage = false,
  hasPreviousPage = false,
  onPageChange,
  onPageSizeChange,
  headerActions,
  filters,
  activeFilters = {},
  onFilterChange,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState(externalSearch || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(localSearch, 400);

  // Sync debounced search to parent
  useEffect(() => {
    if (onSearchChange && debouncedSearch !== externalSearch) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch]);

  // Sync external search to local
  useEffect(() => {
    if (externalSearch !== undefined && externalSearch !== localSearch) {
      setLocalSearch(externalSearch);
    }
  }, [externalSearch]);

  // Close filter on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSort = (key: string) => {
    if (!onSortChange) return;
    if (sort === `${key}:asc`) onSortChange(`${key}:desc`);
    else if (sort === `${key}:desc`) onSortChange("");
    else onSortChange(`${key}:asc`);
  };

  const getSortIcon = (key: string) => {
    if (sort === `${key}:asc`) return <ChevronUp className="w-3.5 h-3.5" />;
    if (sort === `${key}:desc`) return <ChevronDown className="w-3.5 h-3.5" />;
    return <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />;
  };

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      {(title || onSearchChange || headerActions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {title && <h1 className="text-2xl font-bold">{title}</h1>}
            {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {onSearchChange && (
              <div className="relative w-48 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            )}
            {/* Filter button */}
            {filters && filters.length > 0 && (
              <div className="relative" ref={filterRef}>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 cursor-pointer relative"
                  onClick={() => setFilterOpen(!filterOpen)}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                {/* Filter dropdown */}
                {filterOpen && (
                  <div className="absolute right-0 top-11 z-50 w-64 bg-popover border border-border rounded-xl shadow-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Filters</span>
                      <button onClick={() => setFilterOpen(false)} className="cursor-pointer text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {filters.map((f) => (
                      <div key={f.key} className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                        {f.type === "boolean" ? (
                          <div className="flex gap-1">
                            {[
                              { label: "All", value: "" },
                              { label: "Yes", value: "true" },
                              { label: "No", value: "false" },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => onFilterChange?.(f.key, opt.value)}
                                className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${
                                  (activeFilters[f.key] || "") === opt.value
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <select
                            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm cursor-pointer"
                            value={activeFilters[f.key] || ""}
                            onChange={(e) => onFilterChange?.(f.key, e.target.value)}
                          >
                            <option value="">All</option>
                            {f.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {headerActions}
          </div>
        </div>
      )}

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value) return null;
            const filter = filters?.find((f) => f.key === key);
            return (
              <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                {filter?.label}: {value === "true" ? "Yes" : value === "false" ? "No" : value}
                <button onClick={() => onFilterChange?.(key, "")} className="cursor-pointer hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="border border-border/30 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/30">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider ${col.sortable ? "cursor-pointer select-none hover:text-foreground transition-colors" : ""} ${col.className || ""}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                    No records found
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={row.id || i} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 ${col.className || ""}`}>
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {onPageChange && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border/30 bg-muted/10 gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Showing {data.length} of {totalRecords}</span>
              {onPageSizeChange && (
                <div className="flex items-center gap-1.5">
                  <span>Per page:</span>
                  <div className="flex gap-0.5">
                    {[5, 10, 20, 50].map((s) => (
                      <button
                        key={s}
                        onClick={() => onPageSizeChange(s)}
                        className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                          pageSize === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                disabled={!hasPreviousPage}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) {
                  p = i + 1;
                } else if (page <= 3) {
                  p = i + 1;
                } else if (page >= totalPages - 2) {
                  p = totalPages - 4 + i;
                } else {
                  p = page - 2 + i;
                }
                return (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-xs cursor-pointer"
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                disabled={!hasNextPage}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
