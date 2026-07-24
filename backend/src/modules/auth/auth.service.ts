import prisma from "@root/prisma.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { hashPassword, comparePassword } from "@/utils/auth.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { generateOtp, getOtpExpiry } from "@/utils/otp.js";
import { sendOtpEmail } from "@/utils/email.js";
import { createWalletTransaction } from "@/utils/walletUtils.js";
import {
  RegisterBody,
  LoginBody,
  VerifyEmailOtpBody,
  ForgotPasswordBody,
  GoogleProfile,
  GoogleStatePayload,
  ResetPasswordBody,
  RegisterResponse,
  userSelectFields,
} from "./auth.types.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const formatUser = (user: any) => ({
  ...user,
  createdAt: dayjs
    .utc(user.createdAt)
    .tz(user.timezone)
    .format("YYYY-MM-DDTHH:mm"),
  updatedAt: dayjs
    .utc(user.updatedAt)
    .tz(user.timezone)
    .format("YYYY-MM-DDTHH:mm"),
});

const getHighestRole = (
  roleNames: string[],
): "USER" | "ADMIN" | "SUPERADMIN" => {
  if (roleNames.includes("SUPERADMIN") || roleNames.includes("SUPER_ADMIN"))
    return "SUPERADMIN";
  if (roleNames.includes("ADMIN")) return "ADMIN";
  return "USER";
};

class AuthService {
  private readonly googleOauthClient = new OAuth2Client();

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private sanitizeRedirectPath(path?: string) {
    if (!path || !path.startsWith("/") || path.startsWith("//")) {
      return "/";
    }

    return path;
  }

  private getGoogleOauthConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
    const frontendBaseUrl = process.env.FRONTEND_URL;
    const frontendGoogleCallbackUrl =
      process.env.FRONTEND_GOOGLE_CALLBACK_URL ??
      `${frontendBaseUrl?.replace(/\/+$/, "")}/auth/google/callback`;

    if (
      !clientId ||
      !clientSecret ||
      !callbackUrl ||
      !frontendBaseUrl ||
      !frontendGoogleCallbackUrl
    ) {
      throw new ApiError(
        "Google auth is not configured on server",
        STATUS_CODES.SERVER_ERROR,
      );
    }

    return {
      clientId,
      clientSecret,
      callbackUrl,
      frontendGoogleCallbackUrl,
    };
  }

  private getJwtSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new ApiError("JWT secret is not defined", STATUS_CODES.SERVER_ERROR);
    }

    return secret;
  }

  private createGoogleState(redirectPath?: string) {
    const payload: GoogleStatePayload = {
      nonce: randomUUID(),
      redirectPath: this.sanitizeRedirectPath(redirectPath),
    };

    return jwt.sign(payload, this.getJwtSecret(), { expiresIn: "10m" });
  }

  private parseGoogleState(state: string): GoogleStatePayload {
    try {
      const decoded = jwt.verify(state, this.getJwtSecret());

      if (typeof decoded !== "object" || decoded === null) {
        throw new ApiError("Invalid OAuth state", STATUS_CODES.BAD_REQUEST);
      }

      const nonce =
        "nonce" in decoded && typeof decoded.nonce === "string"
          ? decoded.nonce
          : "";
      const redirectPath =
        "redirectPath" in decoded && typeof decoded.redirectPath === "string"
          ? this.sanitizeRedirectPath(decoded.redirectPath)
          : "/";

      if (!nonce) {
        throw new ApiError("Invalid OAuth state", STATUS_CODES.BAD_REQUEST);
      }

      return {
        nonce,
        redirectPath,
      };
    } catch {
      const error = new ApiError("Invalid OAuth state", STATUS_CODES.BAD_REQUEST);
      (error as ApiError & { code?: string }).code = "invalid_oauth_state";
      throw error;
    }
  }

  private async exchangeGoogleCodeForIdToken(code: string) {
    const { clientId, clientSecret, callbackUrl } = this.getGoogleOauthConfig();

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl,
      }),
    });

    if (!response.ok) {
      const error = new ApiError(
        "Failed to exchange Google auth code",
        STATUS_CODES.UNAUTHORIZED,
      );
      (error as ApiError & { code?: string }).code = "google_exchange_failed";
      throw error;
    }

    const tokenResponse = (await response.json()) as {
      id_token?: string;
    };

    if (!tokenResponse.id_token) {
      const error = new ApiError(
        "Google ID token was not returned",
        STATUS_CODES.UNAUTHORIZED,
      );
      (error as ApiError & { code?: string }).code = "google_token_missing";
      throw error;
    }

    return tokenResponse.id_token;
  }

  private async verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
    const { clientId } = this.getGoogleOauthConfig();
    const ticket = await this.googleOauthClient.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub) {
      const error = new ApiError("Invalid Google profile", STATUS_CODES.UNAUTHORIZED);
      (error as ApiError & { code?: string }).code = "google_profile_invalid";
      throw error;
    }

    const firstName =
      payload.given_name?.trim() || payload.name?.split(" ")[0] || "Google";
    const fallbackLastName = payload.name?.split(" ").slice(1).join(" ").trim();

    return {
      email: this.normalizeEmail(payload.email),
      emailVerified: Boolean(payload.email_verified),
      firstName,
      lastName: payload.family_name?.trim() || fallbackLastName || "User",
      picture: payload.picture,
      googleId: payload.sub,
    };
  }

  private async bootstrapNewUser(tx: any, userId: number, fullName: string) {
    const roleRecord = await tx.role.findUnique({
      where: { name: "USER" },
    });

    if (!roleRecord) {
      throw new ApiError("USER role not found", STATUS_CODES.SERVER_ERROR);
    }

    await tx.userRole.create({
      data: {
        userId,
        roleId: roleRecord.id,
      },
    });

    const freePlan = await tx.plan.findFirst({ where: { name: "Free" } });
    if (!freePlan) {
      return;
    }

    const now = new Date();
    const periodEnd = dayjs(now).add(1, "month").toDate();

    const subscription = await tx.subscription.create({
      data: {
        userId,
        planId: freePlan.id,
        status: "ACTIVE",
        billingCycle: "MONTHLY",
        startedAt: now,
        expiresAt: periodEnd,
        autoRenew: true,
      },
    });

    const wallet = await tx.userWallet.create({
      data: {
        userId,
        tokensRemaining: freePlan.tokenLimit,
        tokensUsed: 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    await createWalletTransaction(tx, {
      userId,
      walletId: wallet.id,
      amount: freePlan.tokenLimit,
      type: "CREDIT",
      referenceId: `free_plan_signup_${subscription.id}`,
      meta: {
        reason: "FREE_PLAN_SIGNUP_CREDIT",
        planId: freePlan.id,
        subscriptionId: subscription.id,
      },
    });

    await tx.userPreference.create({
      data: {
        userId,
        enableFollowUpQuestions: true,
      },
    });

    await tx.contextMemory.create({
      data: {
        userId,
        type: "GLOBAL",
        title: "My Name",
        memory: `My name is ${fullName}`,
        isAutoSelected: true,
        isAutoGenerated: true,
      },
    });
  }

  private async findOrCreateUserFromGoogleProfile(profile: GoogleProfile) {
    if (!profile.emailVerified) {
      const error = new ApiError(
        "Google email is not verified",
        STATUS_CODES.UNAUTHORIZED,
      );
      (error as ApiError & { code?: string }).code = "google_email_unverified";
      throw error;
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: profile.email },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (existingUser && existingUser.isDeleted) {
      throw new ApiError("Account is deactivated", STATUS_CODES.FORBIDDEN);
    }

    if (existingUser) {
      if (existingUser.googleId && existingUser.googleId !== profile.googleId) {
        const error = new ApiError(
          "Google account does not match existing account",
          STATUS_CODES.CONFLICT,
        );
        (error as ApiError & { code?: string }).code = "google_account_conflict";
        throw error;
      }

      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          googleId: existingUser.googleId ?? profile.googleId,
          isVerified: true,
          profileImage: existingUser.profileImage ?? profile.picture,
        },
        select: userSelectFields,
      });

      return { user: updatedUser, isNewUser: false };
    }

    const tempPasswordHash = await hashPassword(randomUUID());
    const createdUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          password: tempPasswordHash,
          profileImage: profile.picture,
          isVerified: true,
          authProvider: "GOOGLE",
          googleId: profile.googleId,
        },
      });

      await this.bootstrapNewUser(
        tx,
        created.id,
        `${profile.firstName} ${profile.lastName}`,
      );

      return tx.user.findUnique({
        where: { id: created.id },
        select: userSelectFields,
      });
    });

    if (!createdUser) {
      throw new ApiError("Failed to create user session", STATUS_CODES.SERVER_ERROR);
    }

    return { user: createdUser, isNewUser: true };
  }

  private createToken(user: { id: number; role?: string; timezone?: string; userRoles?: Array<{ role: { name: string } }> }) {
    const roleNames = user.userRoles?.map((ur) => ur.role.name) ?? [];
    const highestRole = getHighestRole(roleNames);

    return jwt.sign(
      {
        id: user.id,
        role: highestRole,
        timezone: user.timezone ?? "UTC",
      },
      this.getJwtSecret(),
      { expiresIn: "90d" },
    );
  }

  private getArchivedEmail(email: string, userId: number) {
    return `${email}__deleted_${userId}_${Date.now()}`;
  }

  async getGoogleAuthUrl(redirectPath?: string) {
    const { clientId, callbackUrl } = this.getGoogleOauthConfig();
    const state = this.createGoogleState(redirectPath);

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", callbackUrl);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "select_account");

    return authUrl.toString();
  }

  buildGoogleErrorRedirect(code: string, message?: string) {
    const fallbackUrl =
      process.env.FRONTEND_GOOGLE_CALLBACK_URL ??
      "http://localhost:3000/auth/google/callback";
    const url = new URL(fallbackUrl);
    url.searchParams.set("error", code);
    if (message) {
      url.searchParams.set("message", message);
    }

    return url.toString();
  }

  async handleGoogleCallback({
    code,
    state,
  }: {
    code?: string;
    state?: string;
  }) {
    if (!code) {
      const error = new ApiError(
        "Google auth code is missing",
        STATUS_CODES.BAD_REQUEST,
      );
      (error as ApiError & { code?: string }).code = "google_code_missing";
      throw error;
    }

    if (!state) {
      const error = new ApiError("OAuth state is missing", STATUS_CODES.BAD_REQUEST);
      (error as ApiError & { code?: string }).code = "oauth_state_missing";
      throw error;
    }

    const parsedState = this.parseGoogleState(state);
    const idToken = await this.exchangeGoogleCodeForIdToken(code);
    const profile = await this.verifyGoogleIdToken(idToken);
    const { user, isNewUser } = await this.findOrCreateUserFromGoogleProfile(profile);
    const token = this.createToken(user as any);

    const { frontendGoogleCallbackUrl } = this.getGoogleOauthConfig();
    const redirectUrl = new URL(frontendGoogleCallbackUrl);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set(
      "redirect",
      this.sanitizeRedirectPath(parsedState.redirectPath),
    );
    if (isNewUser) {
      redirectUrl.searchParams.set("newUser", "1");
    }

    return redirectUrl.toString();
  }

  async googleMobileAuth(idToken: string) {
    const profile = await this.verifyGoogleIdToken(idToken);
    const { user, isNewUser } = await this.findOrCreateUserFromGoogleProfile(profile);
    const token = this.createToken(user as any);

    return {
      user: formatUser(user),
      token,
      isNewUser,
    };
  }

  async register(data: RegisterBody): Promise<RegisterResponse> {
    const email = this.normalizeEmail(data.email);
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser && !existingUser.isDeleted) {
      throw new ApiError("Email already registered", STATUS_CODES.CONFLICT);
    }

    if (existingUser && existingUser.isDeleted) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: this.getArchivedEmail(existingUser.email, existingUser.id),
          isActive: false,
        },
      });
    }

    const hashedPassword = await hashPassword(data.password);
    const otp = generateOtp();
    const otpHash = await hashPassword(otp);
    const otpExpiresAt = getOtpExpiry();

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email,
          password: hashedPassword,
          emailVerificationOtpHash: otpHash,
          emailVerificationOtpExpiresAt: otpExpiresAt,
          authProvider: "LOCAL",
        },
      });

      await this.bootstrapNewUser(tx, createdUser.id, `${data.firstName} ${data.lastName}`);

      const user = await tx.user.findUnique({
        where: { id: createdUser.id },
        select: userSelectFields,
      });

      return user;
    });

    await sendOtpEmail(email, otp, "EMAIL_VERIFICATION");

    if (!user) {
      throw new ApiError("Failed to create user session", STATUS_CODES.SERVER_ERROR);
    }

    const token = this.createToken(user as any);

    return {
      user: formatUser(user),
      token,
      requiresEmailVerification: true,
    };
  }

  async login(data: LoginBody) {
    const email = this.normalizeEmail(data.email);
    const user = await prisma.user.findFirst({
      where: { email, isDeleted: false },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new ApiError(
        "Invalid email or password",
        STATUS_CODES.UNAUTHORIZED,
      );
    }

    const hasUserRole = user.userRoles.some((ur) => ur.role.name === "USER");
    if (!hasUserRole) {
      throw new ApiError(
        "Access denied. You do not have user privileges",
        STATUS_CODES.FORBIDDEN,
      );
    }

    if (user.authProvider === "GOOGLE") {
      throw new ApiError(
        "This account uses Google sign-in. Please continue with Google",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(
        "Invalid email or password",
        STATUS_CODES.UNAUTHORIZED,
      );
    }

    if (!user.isVerified) {
      const otp = generateOtp();
      const otpHash = await hashPassword(otp);
      const otpExpiresAt = getOtpExpiry();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationOtpHash: otpHash,
          emailVerificationOtpExpiresAt: otpExpiresAt,
        },
      });

      await sendOtpEmail(email, otp, "EMAIL_VERIFICATION");

      return {
        requiresEmailVerification: true,
        email,
      };
    }

    const token = this.createToken(user);

    const {
      password: _password,
      emailVerificationOtpHash: _emailVerificationOtpHash,
      emailVerificationOtpExpiresAt: _emailVerificationOtpExpiresAt,
      passwordResetOtpHash: _passwordResetOtpHash,
      passwordResetOtpExpiresAt: _passwordResetOtpExpiresAt,
      ...userWithoutPassword
    } = user;

    return { user: formatUser(userWithoutPassword), token };
  }

  async verifyEmailOtp(data: VerifyEmailOtpBody) {
    const email = this.normalizeEmail(data.email);
    const user = await prisma.user.findFirst({
      where: { email, isDeleted: false },
    });

    if (!user) {
      throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);
    }

    if (user.isVerified) {
      return { verified: true };
    }

    if (
      !user.emailVerificationOtpHash ||
      !user.emailVerificationOtpExpiresAt ||
      user.emailVerificationOtpExpiresAt.getTime() < Date.now()
    ) {
      throw new ApiError(
        "OTP expired. Please request a new OTP",
        STATUS_CODES.BAD_REQUEST,
      );
    }

    const isOtpValid = await comparePassword(
      data.otp,
      user.emailVerificationOtpHash,
    );

    if (!isOtpValid) {
      throw new ApiError("Invalid OTP", STATUS_CODES.BAD_REQUEST);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerificationOtpHash: null,
        emailVerificationOtpExpiresAt: null,
      },
    });

    return { verified: true };
  }

  async resendEmailVerificationOtp(data: ForgotPasswordBody) {
    const email = this.normalizeEmail(data.email);
    const user = await prisma.user.findFirst({
      where: { email, isDeleted: false },
    });

    if (!user) {
      throw new ApiError("User not found", STATUS_CODES.NOT_FOUND);
    }

    if (user.isVerified) {
      throw new ApiError("Email is already verified", STATUS_CODES.BAD_REQUEST);
    }

    const otp = generateOtp();
    const otpHash = await hashPassword(otp);
    const otpExpiresAt = getOtpExpiry();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationOtpHash: otpHash,
        emailVerificationOtpExpiresAt: otpExpiresAt,
      },
    });

    await sendOtpEmail(email, otp, "EMAIL_VERIFICATION");

    return { sent: true };
  }

  async forgotPassword(data: ForgotPasswordBody) {
    const email = this.normalizeEmail(data.email);
    const user = await prisma.user.findFirst({
      where: { email, isDeleted: false },
    });

    if (user) {
      if (user.authProvider === "GOOGLE") {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetOtpHash: null,
            passwordResetOtpExpiresAt: null,
          },
        });
        return { sent: true };
      }

      const otp = generateOtp();
      const otpHash = await hashPassword(otp);
      const otpExpiresAt = getOtpExpiry();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetOtpHash: otpHash,
          passwordResetOtpExpiresAt: otpExpiresAt,
        },
      });

      await sendOtpEmail(email, otp, "PASSWORD_RESET");
    }

    return { sent: true };
  }

  async resetPassword(data: ResetPasswordBody) {
    const email = this.normalizeEmail(data.email);
    const user = await prisma.user.findFirst({
      where: { email, isDeleted: false },
    });

    if (!user || user.authProvider === "GOOGLE") {
      throw new ApiError("Invalid or expired OTP", STATUS_CODES.BAD_REQUEST);
    }

    if (
      !user.passwordResetOtpHash ||
      !user.passwordResetOtpExpiresAt ||
      user.passwordResetOtpExpiresAt.getTime() < Date.now()
    ) {
      throw new ApiError("Invalid or expired OTP", STATUS_CODES.BAD_REQUEST);
    }

    const isOtpValid = await comparePassword(
      data.otp,
      user.passwordResetOtpHash,
    );
    if (!isOtpValid) {
      throw new ApiError("Invalid or expired OTP", STATUS_CODES.BAD_REQUEST);
    }

    const nextPasswordHash = await hashPassword(data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: nextPasswordHash,
        passwordResetOtpHash: null,
        passwordResetOtpExpiresAt: null,
      },
    });

    return { updated: true };
  }
}

export default AuthService;
