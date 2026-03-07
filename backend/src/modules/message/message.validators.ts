import Joi from "joi";

const createMessageSchema = Joi.object({
    chatId: Joi.number().integer().positive().required().messages({
        "number.base": "chatId must be a number",
        "any.required": "chatId is required",
    }),
    content: Joi.string().trim().required().messages({
        "string.empty": "Message content is required",
        "any.required": "Message content is required",
    }),
    editedFromId: Joi.number().integer().positive().allow(null).optional(),
});

const starResponseSchema = Joi.object({
    isStarred: Joi.boolean().required().messages({
        "boolean.base": "isStarred must be a boolean",
        "any.required": "isStarred is required",
    }),
});

const listStarredSchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    pageSize: Joi.number().integer().min(1).optional(),
});

const enhancePromptSchema = Joi.object({
    prompt: Joi.string().trim().min(3).max(6000).required().messages({
        "string.base": "Prompt must be a string",
        "string.empty": "Prompt is required",
        "string.min": "Prompt must be at least 3 characters",
        "string.max": "Prompt must be less than 6000 characters",
        "any.required": "Prompt is required",
    }),
});

export const validateCreateMessageSchema = (data: unknown) => {
    return createMessageSchema.validate(data, { abortEarly: false });
};

export const validateStarResponseSchema = (data: unknown) => {
    return starResponseSchema.validate(data, { abortEarly: false });
};

export const validateListStarredSchema = (data: unknown) => {
    return listStarredSchema.validate(data, { abortEarly: false });
};

export const validateEnhancePromptSchema = (data: unknown) => {
    return enhancePromptSchema.validate(data, { abortEarly: false });
};
