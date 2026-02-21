import Joi from "joi";

const createChatSchema = Joi.object({
    title: Joi.string().trim().allow(null, "").optional(),
    folderId: Joi.number().integer().positive().allow(null).optional(),
});

export const validateCreateChatSchema = (data: unknown) => {
    return createChatSchema.validate(data, { abortEarly: false });
};

const updateChatSchema = Joi.object({
    title: Joi.string().trim().optional(),
    folderId: Joi.number().integer().positive().allow(null).optional(),
});

export const validateUpdateChatSchema = (data: unknown) => {
    return updateChatSchema.validate(data, { abortEarly: false });
};
