import Joi from "joi";

export const createContextSchema = Joi.object({
  folderId: Joi.number().integer().optional().allow(null),
  type: Joi.string().valid("GLOBAL", "FOLDER", "CUSTOM").optional(),
  title: Joi.string().trim().required().messages({
    "string.empty": "Title is required",
    "any.required": "Title is required",
  }),
  memory: Joi.string().trim().max(500).required().messages({
    "string.empty": "Memory is required",
    "string.max": "Memory cannot exceed 500 characters",
    "any.required": "Memory is required",
  }),
  priority: Joi.number().integer().optional(),
  isAutoSelected: Joi.boolean().optional(),
});

export const updateContextSchema = Joi.object({
  folderId: Joi.number().integer().optional().allow(null),
  type: Joi.string().valid("GLOBAL", "FOLDER", "CUSTOM").optional(),
  title: Joi.string().trim().optional(),
  memory: Joi.string().trim().max(500).optional().messages({
    "string.max": "Memory cannot exceed 500 characters",
  }),
  priority: Joi.number().integer().optional(),
  isAutoSelected: Joi.boolean().optional(),
});

export const validateCreateContextSchema = (data: unknown) => {
  return createContextSchema.validate(data, { abortEarly: false });
};

export const validateUpdateContextSchema = (data: unknown) => {
  return updateContextSchema.validate(data, { abortEarly: false });
};
