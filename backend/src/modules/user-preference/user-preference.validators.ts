import Joi from "joi";

const updatePreferencesSchema = Joi.object({
  enableFollowUpQuestions: Joi.boolean().optional(),
}).min(1);

export const validateUpdatePreferencesSchema = (data: unknown) => {
  return updatePreferencesSchema.validate(data, { abortEarly: false });
};
