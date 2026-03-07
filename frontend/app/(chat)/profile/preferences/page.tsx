"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { userPreferenceService } from "@/lib/services";
import { Sparkles, Brain, Loader2, Plus, X, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-toastify";

const MAX_ITEMS = 10;
const MAX_CHARS = 300;

interface Preferences {
  enableFollowUpQuestions: boolean;
  contextMemory: string[];
}

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences>({
    enableFollowUpQuestions: true,
    contextMemory: [],
  });
  const [loading, setLoading] = useState(true);
  const [updatingPref, setUpdatingPref] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    userPreferenceService
      .getPreferences()
      .then((res) => {
        if (res?.data?.data) {
          setPreferences({
            enableFollowUpQuestions: res.data.data.enableFollowUpQuestions ?? true,
            contextMemory: res.data.data.contextMemory ?? [],
          });
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const handleToggleFollowUp = async (checked: boolean) => {
    setUpdatingPref(true);
    setPreferences((prev) => ({ ...prev, enableFollowUpQuestions: checked }));
    try {
      await userPreferenceService.updatePreferences({ enableFollowUpQuestions: checked });
    } catch {
      toast.error("Failed to update preferences.");
      setPreferences((prev) => ({ ...prev, enableFollowUpQuestions: !checked }));
    } finally {
      setUpdatingPref(false);
    }
  };

  const handleAddItem = async () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_CHARS) {
      toast.error(`Item cannot exceed ${MAX_CHARS} characters.`);
      return;
    }
    if (preferences.contextMemory.length >= MAX_ITEMS) {
      toast.error(`You can only add up to ${MAX_ITEMS} context items.`);
      return;
    }

    const updated = [...preferences.contextMemory, trimmed];
    setPreferences((prev) => ({ ...prev, contextMemory: updated }));
    setNewItem("");
    setAddingItem(true);

    try {
      await userPreferenceService.updatePreferences({ contextMemory: updated });
      toast.success("Context saved!");
    } catch {
      toast.error("Failed to save context.");
      setPreferences((prev) => ({
        ...prev,
        contextMemory: prev.contextMemory.filter((i) => i !== trimmed),
      }));
    } finally {
      setAddingItem(false);
      inputRef.current?.focus();
    }
  };

  const handleDeleteItem = async (index: number) => {
    const updated = preferences.contextMemory.filter((_, i) => i !== index);
    setPreferences((prev) => ({ ...prev, contextMemory: updated }));
    try {
      await userPreferenceService.updatePreferences({ contextMemory: updated });
    } catch {
      toast.error("Failed to remove context item.");
      setPreferences((prev) => ({ ...prev, contextMemory: preferences.contextMemory }));
    }
  };

  const charsLeft = MAX_CHARS - newItem.length;
  const isAtLimit = preferences.contextMemory.length >= MAX_ITEMS;

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Preferences</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Customize your chat experience
        </p>
      </div>

      {/* ── Memory ─────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold">Memory</h2>
        </div>

        <Card className="border-border/30 bg-card/90 backdrop-blur-sm">
          <CardContent className="space-y-4 pt-5">
            {/* Description */}
            <div className="flex gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                These facts are sent to the AI at the start of every chat - your name, role,
                current project, etc. The AI will always know this without you having to repeat it.
              </p>
            </div>

            {/* Item count bar */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {preferences.contextMemory.length} / {MAX_ITEMS} items
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: MAX_ITEMS }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-4 rounded-full transition-colors ${
                      i < preferences.contextMemory.length
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Saved items */}
            {preferences.contextMemory.length > 0 ? (
              <div className="space-y-2">
                {preferences.contextMemory.map((item, index) => (
                  <div
                    key={index}
                    className="group flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/20 hover:border-border/50 transition-colors"
                  >
                    <span className="flex-1 text-sm leading-snug break-words">{item}</span>
                    <button
                      onClick={() => handleDeleteItem(index)}
                      className="shrink-0 mt-0.5 p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Remove item"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Nothing saved yet. Add your first memory below.
                </p>
              </div>
            )}

            {/* Add new item */}
            {!isAtLimit ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && newItem.trim()) {
                          e.preventDefault();
                          handleAddItem();
                        }
                      }}
                      placeholder='e.g. "I am a software engineer at a fintech startup"'
                      maxLength={MAX_CHARS}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border/50 bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition"
                    />
                  </div>
                  <button
                    onClick={handleAddItem}
                    disabled={!newItem.trim() || addingItem || newItem.length > MAX_CHARS}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    {addingItem ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Add
                  </button>
                </div>
                <div className="flex justify-between items-center px-0.5">
                  <p className="text-xs text-muted-foreground/70">
                    Tip: One fact per item works best.
                  </p>
                  <span
                    className={`text-xs tabular-nums transition-colors ${
                      newItem.length > MAX_CHARS - 20
                        ? newItem.length >= MAX_CHARS
                          ? "text-destructive font-medium"
                          : "text-amber-500"
                        : "text-muted-foreground/60"
                    }`}
                  >
                    {charsLeft}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Info className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Memory is full ({MAX_ITEMS}/{MAX_ITEMS}). Remove an item above to add a new one.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Follow-up Questions ────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold">AI Suggestions</h2>
        </div>

        <Card className="border-border/30 bg-card/90 backdrop-blur-sm">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <label
                  htmlFor="followup-toggle"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Suggested Follow-up Questions
                </label>
                <p className="text-sm text-muted-foreground">
                  Automatically generate 4 context-aware questions at the end of each AI response.
                </p>
              </div>
              <Switch
                id="followup-toggle"
                checked={preferences.enableFollowUpQuestions}
                onCheckedChange={handleToggleFollowUp}
                disabled={updatingPref}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
