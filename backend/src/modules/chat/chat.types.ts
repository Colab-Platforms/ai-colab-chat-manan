export interface CreateChatBody {
  title?: string;
  folderId?: number;
  assistantId?: number | null;
  modelIds?: number[];
  capability?: string;
}

export interface UpdateChatContextsBody {
  contextIds: number[];
}
