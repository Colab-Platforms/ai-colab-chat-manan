import Joi from "joi";
import {
  MAX_CONTEXT_ITEMS,
  MAX_CONTEXT_ITEM_LENGTH,
} from "./user-preference.types.js";

const updatePreferencesSchema = Joi.object({
  enableFollowUpQuestions: Joi.boolean().optional(),
  contextMemory: Joi.array()
    .items(Joi.string().trim().min(1).max(MAX_CONTEXT_ITEM_LENGTH).required())
    .max(MAX_CONTEXT_ITEMS)
    .optional(),
}).min(1);

export const validateUpdatePreferencesSchema = (data: unknown) => {
  return updatePreferencesSchema.validate(data, { abortEarly: false });
};
