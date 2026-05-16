import Joi from "joi";

export const createAttachmentSchema = Joi.object({
  messageId: Joi.number().integer().positive().required().messages({
    "number.base": "messageId must be a number",
    "any.required": "messageId is required",
  }),
});

export const validateCreateAttachmentSchema = (data: unknown) => {
  return createAttachmentSchema.validate(data, { abortEarly: false });
};
