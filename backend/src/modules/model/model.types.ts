import { ModelCapability } from "@prisma/client";

export interface CreateModelBody {
  name: string;
  modelProviderId: number;
  externalId: string;
  capabilities: ModelCapability[];
  description?: string;
}

export interface UpdateModelBody {
  name?: string;
  modelProviderId?: number;
  externalId?: string;
  capabilities?: ModelCapability[];
  description?: string;
  isActive?: boolean;
}
