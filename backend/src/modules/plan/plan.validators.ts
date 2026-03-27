import Joi from "joi";

const createPlanSchema = Joi.object({
    name: Joi.string().trim().required(),
    monthlyPrice: Joi.number().min(0).required(),
    quarterlyPrice: Joi.number().min(0).required(),
    yearlyPrice: Joi.number().min(0).required(),
    tokenLimit: Joi.number().integer().positive().required(),
    features: Joi.object().required(),
});

const updatePlanSchema = Joi.object({
    name: Joi.string().trim().optional(),
    monthlyPrice: Joi.number().min(0).optional(),
    quarterlyPrice: Joi.number().min(0).optional(),
    yearlyPrice: Joi.number().min(0).optional(),
    tokenLimit: Joi.number().integer().positive().optional(),
    features: Joi.object().optional(),
});

export const validateCreatePlanSchema = (data: unknown) => {
    return createPlanSchema.validate(data, { abortEarly: false });
};

export const validateUpdatePlanSchema = (data: unknown) => {
    return updatePlanSchema.validate(data, { abortEarly: false });
};
