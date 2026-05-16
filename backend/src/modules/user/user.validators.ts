import Joi from "joi";

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().optional(),
  lastName: Joi.string().trim().optional(),
  phoneNumber: Joi.string().trim().allow(null, "").optional(),
  isGuideTaken: Joi.boolean().optional(),
});

export const validateUpdateProfileSchema = (data: unknown) => {
  return updateProfileSchema.validate(data, { abortEarly: false });
};
