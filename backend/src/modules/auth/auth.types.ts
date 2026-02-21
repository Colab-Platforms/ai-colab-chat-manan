

export interface RegisterBody {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

export interface LoginBody {
    email: string;
    password: string;
}

export interface AdminLoginBody {
    email: string;
    password: string;
}

export interface JwtPayload {
    id: number;
    role: "USER" | "ADMIN" | "SUPERADMIN";
    timezone: string;
}

export const userSelectFields = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phoneNumber: true,
    isActive: true,
    isVerified: true,
    timezone: true,
    createdAt: true,
    updatedAt: true,
    userRoles: {
        select: {
            role: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
};