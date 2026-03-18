import { ContextType } from "@prisma/client";

export interface CreateContextBody {
  folderId?: number;
  type?: ContextType;
  title: string;
  memory: string;
  priority?: number;
  isAutoSelected?: boolean;
}

export interface UpdateContextBody {
  folderId?: number | null;
  type?: ContextType;
  title?: string;
  memory?: string;
  priority?: number;
  isAutoSelected?: boolean;
}
