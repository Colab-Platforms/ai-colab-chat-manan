export const userProfileSelectFields = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phoneNumber: true,
    profileImage: true,
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

export interface UpdateProfileBody {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    profileImage?: string;
}
