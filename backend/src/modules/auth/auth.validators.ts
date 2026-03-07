import Joi from "joi";

const registerSchema = Joi.object({
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

const loginSchema = Joi.object({
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


export const validateRegisterSchema = (data: unknown) => {
    return registerSchema.validate(data, { abortEarly: false });
};

export const validateLoginSchema = (data: unknown) => {
    return loginSchema.validate(data, { abortEarly: false });
};