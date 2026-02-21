import Joi from "joi";

const createModelProviderSchema = Joi.object({
    name: Joi.string().trim().required(),
    description: Joi.string().trim().allow(null, "").optional(),
    apiKey: Joi.string().trim().allow(null, "").optional(),
});

const updateModelProviderSchema = Joi.object({
    name: Joi.string().trim().optional(),
    description: Joi.string().trim().allow(null, "").optional(),
    apiKey: Joi.string().trim().allow(null, "").optional(),
    isActive: Joi.boolean().optional(),
});

export const validateCreateModelProviderSchema = (data: unknown) => {
    return createModelProviderSchema.validate(data, { abortEarly: false });
};

export const validateUpdateModelProviderSchema = (data: unknown) => {
    return updateModelProviderSchema.validate(data, { abortEarly: false });
};
