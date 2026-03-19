import Joi from "joi";

const createChatSchema = Joi.object({
  title: Joi.string().trim().allow(null, "").optional(),
  folderId: Joi.number().integer().positive().allow(null).optional(),
  assistantId: Joi.number().integer().positive().allow(null).optional(),
  modelIds: Joi.array().items(Joi.number().integer().positive()).optional(),
  capability: Joi.string().valid("STANDARD", "DEEP_RESEARCH", "IMAGE_GENERATION", "WEB_SEARCH", "VISION").optional(),
});

export const validateCreateChatSchema = (data: unknown) => {
  return createChatSchema.validate(data, { abortEarly: false });
};

const updateChatSchema = Joi.object({
  title: Joi.string().trim().optional(),
  folderId: Joi.number().integer().positive().allow(null).optional(),
  assistantId: Joi.number().integer().positive().allow(null).optional(),
  modelIds: Joi.array().items(Joi.number().integer().positive()).optional(),
  capability: Joi.string().valid("STANDARD", "DEEP_RESEARCH", "IMAGE_GENERATION", "WEB_SEARCH", "VISION").optional(),
});

export const validateUpdateChatSchema = (data: unknown) => {
  return updateChatSchema.validate(data, { abortEarly: false });
};

const feedbackSchema = Joi.object({
  isLiked: Joi.boolean().allow(null).required(),
});

export const validateFeedbackSchema = (data: unknown) => {
  return feedbackSchema.validate(data, { abortEarly: false });
};
