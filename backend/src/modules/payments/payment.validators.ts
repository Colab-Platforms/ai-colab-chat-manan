import Joi from "joi";

const createSubscribeOneTimeSchema = Joi.object({
  planId: Joi.number().integer().positive().required(),
  billingCycle: Joi.string().valid("MONTHLY", "QUARTERLY", "YEARLY").required(),
});

export const validateCreateSubscribeOneTimeSchema = (data: unknown) =>
  createSubscribeOneTimeSchema.validate(data, { abortEarly: false });

