import Joi from "joi";

export const registerSchema = Joi.object({
  firstName: Joi.string().trim().required().messages({
    "string.empty": "firstName is required",
    "any.required": "firstName is required",
  }),
  lastName: Joi.string().trim().required().messages({
    "string.empty": "lastName is required",
    "any.required": "lastName is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "A valid email is required",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters",
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "A valid email is required",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
});

export const verifyEmailOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "A valid email is required",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.pattern.base": "OTP must be 6 digits",
      "string.empty": "OTP is required",
      "any.required": "OTP is required",
    }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "A valid email is required",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "A valid email is required",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.pattern.base": "OTP must be 6 digits",
      "string.empty": "OTP is required",
      "any.required": "OTP is required",
    }),
  newPassword: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters",
    "string.empty": "New password is required",
    "any.required": "New password is required",
  }),
});

export const googleMobileAuthSchema = Joi.object({
  idToken: Joi.string().required().messages({
    "string.empty": "idToken is required",
    "any.required": "idToken is required",
  }),
});

export const validateRegisterSchema = (data: unknown) => {
  return registerSchema.validate(data, { abortEarly: false });
};

export const validateLoginSchema = (data: unknown) => {
  return loginSchema.validate(data, { abortEarly: false });
};

export const validateVerifyEmailOtpSchema = (data: unknown) => {
  return verifyEmailOtpSchema.validate(data, { abortEarly: false });
};

export const validateForgotPasswordSchema = (data: unknown) => {
  return forgotPasswordSchema.validate(data, { abortEarly: false });
};

export const validateResetPasswordSchema = (data: unknown) => {
  return resetPasswordSchema.validate(data, { abortEarly: false });
};

export const validateGoogleMobileAuthSchema = (data: unknown) => {
  return googleMobileAuthSchema.validate(data, { abortEarly: false });
};
