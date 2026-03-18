"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Plus, Eye, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/dashboard/data-table";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { ContextModal } from "@/components/contexts/ContextModal";
import { contextService, folderService, userPreferenceService } from "@/lib/services";
import { toast } from "react-toastify";

export default function PreferencesPage() {
  // ── Context state ────────────────────────────────────────────────────────
  const [contexts, setContexts] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loadingContexts, setLoadingContexts] = useState(true);

  // view dialog (read-only)
  const [viewContext, setViewContext] = useState<any | null>(null);

  // create / edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContext, setEditContext] = useState<any | null>(null); // null = create
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Preferences state ────────────────────────────────────────────────────
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [togglingFollowUp, setTogglingFollowUp] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchContexts = useCallback(async () => {
    setLoadingContexts(true);
    try {
      const res = await contextService.list();
      const data = res?.data?.data?.data;
      setContexts(Array.isArray(data) ? data : []);
    } catch {
      setContexts([]);
    } finally {
      setLoadingContexts(false);
    }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await folderService.list();
      const data = res?.data?.data?.data;
      setFolders(Array.isArray(data) ? data : []);
    } catch {
      setFolders([]);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await userPreferenceService.getPreferences();
      const prefs = res?.data?.data;
      setFollowUpEnabled(prefs?.enableFollowUpQuestions ?? false);
    } catch {
      setFollowUpEnabled(false);
    } finally {
      setLoadingPrefs(false);
    }
  }, []);

  useEffect(() => {
    fetchContexts();
    fetchFolders();
    fetchPreferences();
  }, [fetchContexts, fetchFolders, fetchPreferences]);

  // ── Context handlers ──────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditContext(null);
    setEditModalOpen(true);
  };

  const handleSaveContext = async (data: any) => {
    setIsSaving(true);
    try {
      if (editContext) {
        await contextService.update(editContext.id, data);
        toast.success("Context updated");
      } else {
        await contextService.create(data);
        toast.success("Context created");
      }
      setEditModalOpen(false);
      await fetchContexts();
    } catch {
      toast.error("Failed to save context");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await contextService.delete(deleteTarget.id);
      toast.success("Context deleted");
      setDeleteTarget(null);
      await fetchContexts();
    } catch {
      toast.error("Failed to delete context");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Preferences handlers ──────────────────────────────────────────────────

  const handleToggleFollowUp = async (val: boolean) => {
    setTogglingFollowUp(true);
    try {
      await userPreferenceService.updatePreferences({ enableFollowUpQuestions: val });
      setFollowUpEnabled(val);
    } catch {
      toast.error("Failed to update preference");
    } finally {
      setTogglingFollowUp(false);
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────

  const getFolderName = (folderId: number) => {
    if (!Array.isArray(folders)) return "Unknown Folder";
    return folders.find((f) => f.id === folderId)?.name || "Unknown Folder";
  };

  const columns: Column[] = [
    {
      key: "title",
      label: "Title",
      render: (r) => (
        <span className="font-medium max-w-[150px] truncate block" title={r.title}>
          {r.title}
        </span>
      ),
    },
    {
      key: "memory",
      label: "Content Info",
      render: (r) => (
        <span className="max-w-[200px] truncate block text-muted-foreground text-xs" title={r.memory}>
          {r.memory}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (r) => (
        <div className="flex flex-col gap-1 items-start">
          <Badge variant={r.type === "GLOBAL" ? "default" : r.type === "FOLDER" ? "secondary" : "outline"}>
            {r.type}
          </Badge>
          {r.type === "FOLDER" && r.folderId && (
            <span className="text-[10px] text-muted-foreground ml-1">
              in {getFolderName(r.folderId)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "isAutoSelected",
      label: "Auto-Selected",
      render: (r) => (
        <Badge variant={r.isAutoSelected ? "default" : "secondary"} className="text-[10px] uppercase">
          {r.isAutoSelected ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (r) => (
        <span className="text-xs whitespace-nowrap">
          {new Date(r.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="View"
            onClick={() => setViewContext(r)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-blue-500"
            title="Edit"
            onClick={() => { setEditContext(r); setEditModalOpen(true); }}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            disabled={r.isAutoGenerated}
            title={r.isAutoGenerated ? "Cannot delete system generated context" : "Delete"}
            onClick={() => setDeleteTarget(r)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Context Memory ── */}
      <section className="space-y-4">
        <DataTable
          columns={columns}
          data={contexts}
          title="Preferences"
          description="Customize your chat experience and AI behaviour"
          searchPlaceholder="Search contexts..."
          headerActions={
            <Button onClick={handleOpenCreate} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Context
            </Button>
          }
        />
      </section>

      {/* ── AI Suggestions ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold">AI Suggestions</h2>
        </div>

        <Card className="border-border/30 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Suggested Follow-up Questions</p>
                <p className="text-xs text-muted-foreground">
                  Automatically generate 4 context-aware questions at the end of each AI response.
                </p>
              </div>
              <Switch
                checked={followUpEnabled}
                onCheckedChange={handleToggleFollowUp}
                disabled={togglingFollowUp || loadingPrefs}
                id="follow-up-toggle"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── View Dialog (read-only, matches users module pattern) ── */}
      <Dialog open={!!viewContext} onOpenChange={() => setViewContext(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Context Details</DialogTitle>
          </DialogHeader>
          {viewContext && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Title: </span>
                <span className="font-medium">{viewContext.title}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Type: </span>
                  <Badge variant={viewContext.type === "GLOBAL" ? "default" : viewContext.type === "FOLDER" ? "secondary" : "outline"}>
                    {viewContext.type}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Auto-Selected: </span>
                  <Badge variant={viewContext.isAutoSelected ? "default" : "secondary"} className="text-[10px] uppercase">
                    {viewContext.isAutoSelected ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
              {viewContext.type === "FOLDER" && viewContext.folderId && (
                <div>
                  <span className="text-muted-foreground">Folder: </span>
                  <span className="font-medium">{getFolderName(viewContext.folderId)}</span>
                </div>
              )}
              <div>
                <p className="text-muted-foreground mb-1">Memory Content:</p>
                <p className="bg-muted/40 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {viewContext.memory}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Created: {new Date(viewContext.createdAt).toLocaleString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Modal ── */}
      <ContextModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveContext}
        initialData={editContext}
        folders={folders}
        isSaving={isSaving}
        mode={editContext ? "edit" : "create"}
      />

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null); }}
        title="Delete Context"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </div>
  );
}
