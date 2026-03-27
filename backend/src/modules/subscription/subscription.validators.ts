import Joi from "joi";

const createSubscriptionSchema = Joi.object({
    planId: Joi.number().integer().positive().required(),
    billingCycle: Joi.string().valid("MONTHLY", "QUARTERLY", "YEARLY").required(),
    forceRetry: Joi.boolean().optional(),
});

export const validateCreateSubscriptionSchema = (data: unknown) => {
    return createSubscriptionSchema.validate(data, { abortEarly: false });
};
