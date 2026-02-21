export interface CreateModelProviderBody {
    name: string;
    description?: string;
    apiKey?: string;
}

export interface UpdateModelProviderBody {
    name?: string;
    description?: string;
    apiKey?: string;
    isActive?: boolean;
}
