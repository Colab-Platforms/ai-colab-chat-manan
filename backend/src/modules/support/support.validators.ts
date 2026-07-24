import Joi from "joi";

export const raiseTicketSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required().messages({
    "string.empty": "Name is required",
    "any.required": "Name is required",
  }),
  email: Joi.string().trim().email({ tlds: false }).required().messages({
    "string.empty": "Email is required",
    "string.email": "Enter a valid email address",
    "any.required": "Email is required",
  }),
  category: Joi.string().trim().max(60).allow("").optional(),
  subject: Joi.string().trim().min(3).max(150).required().messages({
    "string.empty": "Subject is required",
    "any.required": "Subject is required",
  }),
  message: Joi.string().trim().min(10).max(5000).required().messages({
    "string.empty": "Please describe your issue",
    "string.min": "Please provide a bit more detail (at least 10 characters)",
    "any.required": "Please describe your issue",
  }),
});

export const contactUsSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required().messages({
    "string.empty": "Name is required",
    "any.required": "Name is required",
  }),
  email: Joi.string().trim().email({ tlds: false }).required().messages({
    "string.empty": "Email is required",
    "string.email": "Enter a valid email address",
    "any.required": "Email is required",
  }),
  subject: Joi.string().trim().min(3).max(150).required().messages({
    "string.empty": "Subject is required",
    "any.required": "Subject is required",
  }),
  message: Joi.string().trim().min(10).max(5000).required().messages({
    "string.empty": "Message is required",
    "string.min": "Please provide a bit more detail (at least 10 characters)",
    "any.required": "Message is required",
  }),
});

export const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED")
    .required()
    .messages({
      "any.only": "Invalid status",
      "any.required": "Status is required",
    }),
});

export const validateRaiseTicketSchema = (data: unknown) => {
  return raiseTicketSchema.validate(data, { abortEarly: false });
};

export const validateContactUsSchema = (data: unknown) => {
  return contactUsSchema.validate(data, { abortEarly: false });
};

export const validateUpdateStatusSchema = (data: unknown) => {
  return updateStatusSchema.validate(data, { abortEarly: false });
};
