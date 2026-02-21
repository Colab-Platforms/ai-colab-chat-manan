import Joi from "joi";

const createPlanSchema = Joi.object({
    name: Joi.string().trim().required(),
    monthlyPrice: Joi.number().positive().required(),
    quarterlyPrice: Joi.number().positive().required(),
    yearlyPrice: Joi.number().positive().required(),
    tokenLimit: Joi.number().integer().positive().required(),
    features: Joi.object().required(),
});

const updatePlanSchema = Joi.object({
    name: Joi.string().trim().optional(),
    monthlyPrice: Joi.number().positive().optional(),
    quarterlyPrice: Joi.number().positive().optional(),
    yearlyPrice: Joi.number().positive().optional(),
    tokenLimit: Joi.number().integer().positive().optional(),
    features: Joi.object().optional(),
});

export const validateCreatePlanSchema = (data: unknown) => {
    return createPlanSchema.validate(data, { abortEarly: false });
};

export const validateUpdatePlanSchema = (data: unknown) => {
    return updatePlanSchema.validate(data, { abortEarly: false });
};
