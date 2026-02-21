"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable, Column } from "@/components/dashboard/data-table";
import { userService } from "@/lib/services";
import { Loader2, Eye, Pencil, ShieldCheck, Trash2, Save } from "lucide-react";
import { toast } from "react-toastify";

export default function UsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<any>({});
  const [viewUser, setViewUser] = useState<any>(null);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phoneNumber: "", isActive: true });
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: String(page), pageSize: String(pageSize) };
      if (search) params.search = search;
      if (sort) params.sort = sort;
      Object.entries(activeFilters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await userService.list(params);
      const result = res.data.data;
      setUsers(result?.data || []);
      setPagination(result || {});
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [search, sort, page, pageSize, activeFilters]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, sort, pageSize, activeFilters]);

  const openEdit = (u: any) => {
    setForm({ firstName: u.firstName, lastName: u.lastName, phoneNumber: u.phoneNumber || "", isActive: u.isActive });
    setEditUser(u);
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await userService.update(editUser.id, form);
      toast.success("User updated");
      setEditUser(null);
      fetchUsers();
    } catch { toast.error("Failed to save"); } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await userService.delete(deleteId);
      toast.success("User deleted");
      setDeleteId(null);
      fetchUsers();
    } catch { toast.error("Failed to delete"); } finally {
      setDeleting(false);
    }
  };

  const handleMakeAdmin = async (id: number) => {
    try {
      await userService.makeAdmin(id);
      toast.success("User promoted to admin");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const columns: Column[] = [
    { key: "firstName", label: "Name", sortable: true, render: (r) => <span className="font-medium">{r.firstName} {r.lastName}</span> },
    { key: "email", label: "Email", sortable: true, render: (r) => <span className="text-muted-foreground">{r.email}</span> },
    { key: "roles", label: "Roles", render: (r) => r.userRoles?.map((ur: any) => <Badge key={ur.role.id} variant="secondary" className="mr-1 text-xs">{ur.role.name}</Badge>) },
    { key: "isActive", label: "Status", sortable: false, render: (r) => <Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", label: "Actions", className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewUser(r)} title="View"><Eye className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleMakeAdmin(r.id)} title="Make Admin"><ShieldCheck className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(r.id)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={users}
        title="Users"
        description="Manage user accounts"
        searchPlaceholder="Search users..."
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        page={page}
        pageSize={pageSize}
        totalRecords={pagination.totalRecords || 0}
        totalPages={pagination.totalPages || 1}
        hasNextPage={pagination.hasNextPage || false}
        hasPreviousPage={pagination.hasPreviousPage || false}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        filters={[
          { key: "isActive", label: "Active", type: "boolean" },
          { key: "isVerified", label: "Verified", type: "boolean" },
        ]}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
      />

      {/* View */}
      <Dialog open={!!viewUser} onOpenChange={() => setViewUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>User Details</DialogTitle></DialogHeader>
          {viewUser && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{viewUser.firstName} {viewUser.lastName}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{viewUser.email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{viewUser.phoneNumber || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Active:</span> <Badge variant={viewUser.isActive ? "default" : "secondary"}>{viewUser.isActive ? "Yes" : "No"}</Badge></div>
              </div>
              <div><span className="text-muted-foreground">Roles:</span> {viewUser.userRoles?.map((ur: any) => <Badge key={ur.role.id} variant="secondary" className="mr-1">{ur.role.name}</Badge>)}</div>
              <div className="text-muted-foreground text-xs">Created: {new Date(viewUser.createdAt).toLocaleString()}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><label className="text-sm font-medium">First name</label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-sm font-medium">Last name</label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><label className="text-sm font-medium">Phone</label><Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} id="userActive" className="rounded" />
              <label htmlFor="userActive" className="text-sm">Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete User" description="This will permanently delete this user account. This action cannot be undone." onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
