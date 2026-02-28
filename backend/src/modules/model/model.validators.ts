import Joi from "joi";

const createModelSchema = Joi.object({
  name: Joi.string().trim().required(),
  modelProviderId: Joi.number().integer().positive().required(),
  externalId: Joi.string().trim().required(),
  capabilities: Joi.array()
    .items(
      Joi.string().valid(
        "STANDARD",
        "DEEP_RESEARCH",
        "IMAGE_GENERATION",
        "WEB_SEARCH",
      ),
    )
    .min(1)
    .required(),
  description: Joi.string().trim().allow(null, "").optional(),
  tokenMultiplier: Joi.number().optional(),
  isActive: Joi.boolean().optional(),
  defaultForCapabilities: Joi.array()
    .items(
      Joi.string().valid(
        "STANDARD",
        "DEEP_RESEARCH",
        "IMAGE_GENERATION",
        "WEB_SEARCH",
      ),
    )
    .optional(),
});

const updateModelSchema = Joi.object({
  name: Joi.string().trim().optional(),
  modelProviderId: Joi.number().integer().positive().optional(),
  externalId: Joi.string().trim().optional(),
  capabilities: Joi.array()
    .items(
      Joi.string().valid(
        "STANDARD",
        "DEEP_RESEARCH",
        "IMAGE_GENERATION",
        "WEB_SEARCH",
      ),
    )
    .min(1)
    .optional(),
  description: Joi.string().trim().allow(null, "").optional(),
  tokenMultiplier: Joi.number().optional(),
  isActive: Joi.boolean().optional(),
  defaultForCapabilities: Joi.array()
    .items(
      Joi.string().valid(
        "STANDARD",
        "DEEP_RESEARCH",
        "IMAGE_GENERATION",
        "WEB_SEARCH",
      ),
    )
    .optional(),
})
  .min(1)
  .unknown(false);

export const validateCreateModelSchema = (data: unknown) => {
  return createModelSchema.validate(data, { abortEarly: false });
};

export const validateUpdateModelSchema = (data: unknown) => {
  return updateModelSchema.validate(data, { abortEarly: false, convert: true });
};
