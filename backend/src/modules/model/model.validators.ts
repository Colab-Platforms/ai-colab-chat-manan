import Joi from "joi";

const createModelSchema = Joi.object({
    name: Joi.string().trim().required(),
    modelProviderId: Joi.number().integer().positive().required(),
    externalId: Joi.string().trim().required(),
    inputCostPer1k: Joi.number().positive().required(),
    outputCostPer1k: Joi.number().positive().required(),
    description: Joi.string().trim().allow(null, "").optional(),
});

const updateModelSchema = Joi.object({
    name: Joi.string().trim().optional(),
    inputCostPer1k: Joi.number().positive().optional(),
    outputCostPer1k: Joi.number().positive().optional(),
    description: Joi.string().trim().allow(null, "").optional(),
    isActive: Joi.boolean().optional(),
});

export const validateCreateModelSchema = (data: unknown) => {
    return createModelSchema.validate(data, { abortEarly: false });
};

export const validateUpdateModelSchema = (data: unknown) => {
    return updateModelSchema.validate(data, { abortEarly: false });
};
