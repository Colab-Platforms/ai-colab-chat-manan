"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { userPreferenceService } from "@/lib/services";
import { Sparkles, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-toastify";

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState({ enableFollowUpQuestions: true });
  const [loading, setLoading] = useState(true);
  const [updatingPref, setUpdatingPref] = useState(false);

  useEffect(() => {
    userPreferenceService.getPreferences()
      .then(res => {
        if (res?.data?.data) {
          setPreferences(res.data.data);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const handleToggleFollowUp = async (checked: boolean) => {
    setUpdatingPref(true);
    // Optimistic UI update
    setPreferences(prev => ({ ...prev, enableFollowUpQuestions: checked }));
    try {
      await userPreferenceService.updatePreferences({ enableFollowUpQuestions: checked });
    } catch {
      toast.error("Failed to update preferences.");
      // Revert if error
      setPreferences(prev => ({ ...prev, enableFollowUpQuestions: !checked }));
    } finally {
      setUpdatingPref(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Preferences</h1>
        <p className="text-muted-foreground text-sm mt-1">Customize your chat experience</p>
      </div>

      <Card className="border-border/30 bg-card/90 backdrop-blur-sm">
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label 
                htmlFor="followup-toggle"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Suggested Follow-up Questions
              </label>
              <p className="text-sm text-muted-foreground w-full text-balance">
                Automatically generate 4 context-aware questions at the end of the AI's response to help keep the conversation flowing.
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
  );
}
