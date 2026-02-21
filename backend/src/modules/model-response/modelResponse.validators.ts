import Joi from "joi";

const completeResponseSchema = Joi.object({
    chatId: Joi.number().integer().positive().required(),
    messageId: Joi.number().integer().positive().required(),
    modelId: Joi.number().integer().positive().required(),
    content: Joi.string().required(),
    promptTokens: Joi.number().integer().min(0).required(),
    completionTokens: Joi.number().integer().min(0).required(),
});

export const validateCompleteResponseSchema = (data: unknown) => {
    return completeResponseSchema.validate(data, { abortEarly: false });
};
