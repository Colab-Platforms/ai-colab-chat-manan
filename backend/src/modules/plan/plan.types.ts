export interface CreatePlanBody {
    name: string;
    monthlyPrice: number;
    quarterlyPrice: number;
    yearlyPrice: number;
    tokenLimit: number;
    features: any;
    isActive?: boolean;
}

export interface UpdatePlanBody {
    name?: string;
    monthlyPrice?: number;
    quarterlyPrice?: number;
    yearlyPrice?: number;
    tokenLimit?: number;
    features?: any;
    isActive?: boolean;
}
