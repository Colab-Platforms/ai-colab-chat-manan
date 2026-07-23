"use client";

import { memo, type Dispatch, type ElementType, type SetStateAction } from "react";
import * as LucideIcons from "lucide-react";
import { Bot, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SIDEBAR_SECTION_HEADER_ROW, SIDEBAR_SECTION_TITLE } from "@/components/sidebar/sidebar-section-styles";
import type { Assistant } from "@/components/sidebar/sidebar-types";

const ASSISTANT_ICON_EMOJI: Record<string, string> = {
  Code2: "💻",
  PenLine: "🎨",
  Scale: "⚖️",
  Megaphone: "🚀",
};

export const AssistantsSection = memo(function AssistantsSection({
  assistants,
  assistantsExpanded,
  setAssistantsExpanded,
  assistantsHasMore,
  onLoadMoreAssistants,
  onAssistantSelected,
}: {
  assistants: Assistant[];
  assistantsExpanded: boolean;
  setAssistantsExpanded: Dispatch<SetStateAction<boolean>>;
  assistantsHasMore?: boolean;
  onLoadMoreAssistants?: () => void;
  onAssistantSelected: (assistant: Assistant) => void;
}) {
  if (assistants.length === 0) return null;

  return (
    <>
      <div className={`${SIDEBAR_SECTION_HEADER_ROW}`} data-guide="assistants">
        <button
          type="button"
          className="min-w-0 flex-1 py-2.5 px-3 text-left"
          onClick={() => setAssistantsExpanded((p) => !p)}
        >
          <span className={`block w-full text-left ${SIDEBAR_SECTION_TITLE}`}>Assistants</span>
        </button>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/80"
          onClick={() => setAssistantsExpanded((p) => !p)}
          aria-expanded={assistantsExpanded}
          aria-label={assistantsExpanded ? "Collapse assistants" : "Expand assistants"}
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${assistantsExpanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>
      {assistantsExpanded && assistants.map((assistant) => {
        const emoji = ASSISTANT_ICON_EMOJI[assistant.icon];
        const IconComponent =
          (LucideIcons as unknown as Record<string, ElementType>)[assistant.icon] || Bot;

        return (
          <button
            key={assistant.id}
            onClick={() => onAssistantSelected(assistant)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer hover:bg-sidebar-accent text-foreground"
            title={assistant.description || assistant.name}
          >
            {emoji ? (
              <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-sm leading-none">
                {emoji}
              </span>
            ) : (
              <IconComponent className="w-4 h-4 flex-shrink-0 text-primary" />
            )}
            <span className="truncate flex-1 text-left">{assistant.name}</span>
          </button>
        );
      })}
      {assistantsExpanded && assistantsHasMore && (
        <Button
          variant="ghost"
          className="w-full mt-1 text-xs text-muted-foreground hover:text-foreground h-8 cursor-pointer"
          onClick={onLoadMoreAssistants}
        >
          Load More Assistants
        </Button>
      )}
    </>
  );
}, (prev, next) => {
  if (prev.assistantsExpanded !== next.assistantsExpanded) return false;
  if (Boolean(prev.assistantsHasMore) !== Boolean(next.assistantsHasMore)) return false;
  if (prev.onLoadMoreAssistants !== next.onLoadMoreAssistants) return false;
  if (prev.onAssistantSelected !== next.onAssistantSelected) return false;
  if (prev.assistants.length !== next.assistants.length) return false;

  for (let i = 0; i < prev.assistants.length; i += 1) {
    const a = prev.assistants[i];
    const b = next.assistants[i];
    if (
      a.id !== b.id ||
      a.name !== b.name ||
      a.icon !== b.icon ||
      a.description !== b.description ||
      a.isActive !== b.isActive
    ) {
      return false;
    }
  }
  return true;
});
