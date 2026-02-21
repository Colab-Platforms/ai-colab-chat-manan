export interface CreateModelBody {
    name: string;
    modelProviderId: number;
    externalId: string;
    inputCostPer1k: number;
    outputCostPer1k: number;
    description?: string;
}

export interface UpdateModelBody {
    name?: string;
    inputCostPer1k?: number;
    outputCostPer1k?: number;
    description?: string;
    isActive?: boolean;
}
