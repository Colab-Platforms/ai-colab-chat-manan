"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable, Column } from "@/components/dashboard/data-table";
import { modelService, modelProviderService } from "@/lib/services";
import { Loader2, Eye, Pencil, Trash2, Save, Plus } from "lucide-react";
import { toast } from "react-toastify";

const CAPABILITY_OPTIONS = [
  { value: "STANDARD", label: "Standard" },
  { value: "DEEP_RESEARCH", label: "Deep Research" },
  { value: "IMAGE_GENERATION", label: "Image Generation" },
  { value: "WEB_SEARCH", label: "Web Search" },
];

export default function ModelsAdminPage() {
  const [models, setModels] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<any>({});
  const [viewModel, setViewModel] = useState<any>(null);
  const [editModel, setEditModel] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const defaultForm = { name: "", externalId: "", modelProviderId: 0, capabilities: ["STANDARD"], isActive: true };
  const [form, setForm] = useState(defaultForm);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const handleFilterChange = (key: string, value: string) => setActiveFilters((prev) => ({ ...prev, [key]: value }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: String(page), pageSize: String(pageSize) };
      if (search) params.search = search;
      if (sort) params.sort = sort;
      Object.entries(activeFilters).forEach(([k, v]) => { if (v) params[k] = v; });
      const [modelRes, provRes] = await Promise.all([modelService.list(params), modelProviderService.list()]);
      const result = modelRes.data.data;
      setModels(result?.data || []);
      setPagination(result || {});
      setProviders(provRes.data.data?.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [search, sort, page, pageSize, activeFilters]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, sort, pageSize, activeFilters]);

  const openEdit = (m: any) => { setForm({ name: m.name, externalId: m.externalId, modelProviderId: m.modelProviderId, capabilities: m.capabilities || ["STANDARD"], isActive: m.isActive }); setEditModel(m); };
  const handleOpenCreate = () => { setForm(defaultForm); setEditModel({ id: "new" }); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editModel.id === "new") {
        await modelService.create(form); toast.success("Model created");
      } else {
        await modelService.update(editModel.id, form); toast.success("Model updated");
      }
      setEditModel(null); fetchData();
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  };

  const handleToggleActive = async (m: any) => {
    try { await modelService.update(m.id, { isActive: !m.isActive }); toast.success(m.isActive ? "Model disabled" : "Model enabled"); fetchData(); }
    catch { toast.error("Failed"); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try { await modelService.delete(deleteId); toast.success("Model deleted"); setDeleteId(null); fetchData(); }
    catch { toast.error("Failed to delete"); } finally { setDeleting(false); }
  };

  const columns: Column[] = [
    { key: "name", label: "Name", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "externalId", label: "External ID", render: (r) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.externalId}</code> },
    { key: "provider", label: "Provider", render: (r) => r.modelProvider?.name },
    { key: "capabilities", label: "Capabilities", render: (r) => <div className="flex flex-wrap gap-1">{r.capabilities?.map((c: string) => <Badge key={c} variant="outline" className="text-[10px]">{c.replace("_", " ")}</Badge>)}</div> },
    { key: "isActive", label: "Status", sortable: true, render: (r) => <Badge variant={r.isActive ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleToggleActive(r)}>{r.isActive ? "Active" : "Disabled"}</Badge> },
    {
      key: "actions", label: "Actions", className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewModel(r)}><Eye className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns} data={models} title="Models" description="Manage AI models" searchPlaceholder="Search models..."
        search={search} onSearchChange={setSearch} sort={sort} onSortChange={setSort}
        page={page} pageSize={pageSize} totalRecords={pagination.totalRecords || 0} totalPages={pagination.totalPages || 1}
        hasNextPage={pagination.hasNextPage} hasPreviousPage={pagination.hasPreviousPage}
        onPageChange={setPage} onPageSizeChange={setPageSize}
        headerActions={<Button onClick={handleOpenCreate} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Model</Button>}
        filters={[{ key: "isActive", label: "Active", type: "boolean" }]}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
      />

      {/* View */}
      <Dialog open={!!viewModel} onOpenChange={() => setViewModel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Model Details</DialogTitle></DialogHeader>
          {viewModel && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{viewModel.name}</span></div>
              <div><span className="text-muted-foreground">External ID:</span> <code className="text-xs bg-muted px-1 rounded">{viewModel.externalId}</code></div>
              <div><span className="text-muted-foreground">Provider:</span> {viewModel.modelProvider?.name}</div>
              <div>
                <span className="text-muted-foreground block mb-1">Capabilities:</span> 
                <div className="flex flex-wrap gap-1">{viewModel.capabilities?.map((c: string) => <Badge key={c} variant="outline">{c.replace("_", " ")}</Badge>)}</div>
              </div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={viewModel.isActive ? "default" : "secondary"}>{viewModel.isActive ? "Active" : "Disabled"}</Badge></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit */}
      <Dialog open={!!editModel} onOpenChange={() => setEditModel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Model</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><label className="text-sm font-medium">Name</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-sm font-medium">External ID</label><Input value={form.externalId} onChange={(e) => setForm({ ...form, externalId: e.target.value })} placeholder="e.g. openai/gpt-4.1" /></div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Provider</label>
              <select className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background" value={form.modelProviderId} onChange={(e) => setForm({ ...form, modelProviderId: parseInt(e.target.value) })}>
                <option value={0} disabled>Select Provider</option>
                {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Capabilities</label>
              <div className="grid grid-cols-2 gap-2">
                {CAPABILITY_OPTIONS.map(opt => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`cap-${opt.value}`}
                      checked={form.capabilities.includes(opt.value)} 
                      onChange={(e) => {
                        const newCaps = e.target.checked 
                          ? [...form.capabilities, opt.value]
                          : form.capabilities.filter(c => c !== opt.value);
                        setForm({ ...form, capabilities: newCaps });
                      }} 
                      className="rounded" 
                    />
                    <label htmlFor={`cap-${opt.value}`} className="text-xs">{opt.label}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} id="isActive" className="rounded" />
              <label htmlFor="isActive" className="text-sm">Active</label>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Model" description="This will permanently delete this model." onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
