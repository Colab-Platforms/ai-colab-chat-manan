"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface Model {
  id: number;
  name: string;
  description: string | null;
}

interface ModelSelectorProps {
  models: Model[];
  selected: number[];
  onChange: (ids: number[]) => void;
  maxModels: number;
}

export function ModelSelector({ models, selected, onChange, maxModels }: ModelSelectorProps) {
  const isSingle = maxModels === 1;

  const toggle = (modelId: number) => {
    if (isSingle) {
      onChange([modelId]);
      return;
    }

    if (selected.includes(modelId)) {
      if (selected.length > 1) {
        onChange(selected.filter((id) => id !== modelId));
      }
    } else {
      if (maxModels === -1 || selected.length < maxModels) {
        onChange([...selected, modelId]);
      }
    }
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
      {models.map((model) => {
        const isSelected = selected.includes(model.id);
        return (
          <button
            key={model.id}
            onClick={() => toggle(model.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {isSelected && <Check className="w-3 h-3" />}
            {model.name}
          </button>
        );
      })}
      {!isSingle && selected.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {selected.length} selected
        </Badge>
      )}
    </div>
  );
}
