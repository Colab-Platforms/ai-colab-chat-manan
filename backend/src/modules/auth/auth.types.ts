export interface RegisterBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: any;
  token: string;
  requiresEmailVerification: boolean;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface GoogleStatePayload {
  nonce: string;
  redirectPath?: string;
}

export interface GoogleProfile {
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  picture?: string;
  googleId: string;
}

export interface VerifyEmailOtpBody {
  email: string;
  otp: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  email: string;
  otp: string;
  newPassword: string;
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
  isGuideTaken: true,
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
