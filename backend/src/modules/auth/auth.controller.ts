import { Request, Response } from "express";
import { sendResponse } from "@/utils/responseUtils.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import AuthService from "./auth.service.js";
import {
  validateRegisterSchema,
  validateLoginSchema,
  validateVerifyEmailOtpSchema,
  validateForgotPasswordSchema,
  validateResetPasswordSchema,
} from "./auth.validators.js";

const authService = new AuthService();

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateRegisterSchema(req.body);

    if (error) {
      console.error("Register validation error", error);
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }

    const result = await authService.register(value);
    sendResponse(
      res,
      true,
      result,
      "User registered successfully",
      STATUS_CODES.CREATED,
    );
  } catch (error: any) {
    console.error("Register error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = validateLoginSchema(req.body);

    if (error) {
      console.error("Login validation error", error);
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }

    const result = await authService.login(value);
    const message = (result as { requiresEmailVerification?: boolean })
      .requiresEmailVerification
      ? "Email verification required"
      : "You logged in successfully";
    sendResponse(res, true, result, message, STATUS_CODES.OK);
  } catch (error: any) {
    console.error("Login error", error);
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const startGoogleAuth = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const redirectPath =
      typeof req.query.redirect === "string" ? req.query.redirect : undefined;
    const authUrl = await authService.getGoogleAuthUrl(redirectPath);
    res.redirect(authUrl);
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const googleAuthCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const code =
      typeof req.query.code === "string" ? req.query.code : undefined;
    const state =
      typeof req.query.state === "string" ? req.query.state : undefined;
    const oauthError =
      typeof req.query.error === "string" ? req.query.error : undefined;

    if (oauthError) {
      const redirectUrl = authService.buildGoogleErrorRedirect(
        "google_auth_denied",
      );
      res.redirect(redirectUrl);
      return;
    }

    const redirectUrl = await authService.handleGoogleCallback({ code, state });
    res.redirect(redirectUrl);
  } catch (error: any) {
    const redirectUrl = authService.buildGoogleErrorRedirect(
      error.code ?? "google_auth_failed",
      error.message,
    );
    res.redirect(redirectUrl);
  }
};

export const verifyEmailOtp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateVerifyEmailOtpSchema(req.body);

    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }

    const result = await authService.verifyEmailOtp(value);
    sendResponse(
      res,
      true,
      result,
      "Email verified successfully",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const resendEmailVerificationOtp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateForgotPasswordSchema(req.body);

    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }

    const result = await authService.resendEmailVerificationOtp(value);
    sendResponse(res, true, result, "Verification OTP sent", STATUS_CODES.OK);
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateForgotPasswordSchema(req.body);

    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }

    const result = await authService.forgotPassword(value);
    sendResponse(
      res,
      true,
      result,
      "If the email exists, OTP has been sent",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { error, value } = validateResetPasswordSchema(req.body);

    if (error) {
      sendResponse(res, false, error, error.message, STATUS_CODES.BAD_REQUEST);
      return;
    }

    const result = await authService.resetPassword(value);
    sendResponse(
      res,
      true,
      result,
      "Password reset successful",
      STATUS_CODES.OK,
    );
  } catch (error: any) {
    sendResponse(
      res,
      false,
      null,
      error.message,
      error.statusCode ?? STATUS_CODES.SERVER_ERROR,
    );
  }
};
