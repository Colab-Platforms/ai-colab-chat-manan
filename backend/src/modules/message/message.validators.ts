import Joi from "joi";

const createMessageSchema = Joi.object({
    chatId: Joi.number().integer().positive().required().messages({
        "number.base": "chatId must be a number",
        "any.required": "chatId is required",
    }),
    content: Joi.string().trim().required().messages({
        "string.empty": "Message content is required",
        "any.required": "Message content is required",
    }),
    editedFromId: Joi.number().integer().positive().allow(null).optional(),
});

export const validateCreateMessageSchema = (data: unknown) => {
    return createMessageSchema.validate(data, { abortEarly: false });
};
