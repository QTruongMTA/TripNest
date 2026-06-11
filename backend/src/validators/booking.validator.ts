import Joi from "joi";

export const createPropertyBookingSchema = Joi.object({
  propertyId: Joi.string().required(),
  checkIn: Joi.date().iso().required(),
  checkOut: Joi.date().iso().greater(Joi.ref("checkIn")).required(),
  guests: Joi.number().integer().min(1).required(),
  notes: Joi.string().allow("", null).optional(),
});

export const recordPaymentSchema = Joi.object({
  method: Joi.string().valid("CASH", "BANK_TRANSFER", "MOMO", "VNPAY", "ZALOPAY", "CREDIT_CARD").required(),
  transactionId: Joi.string().allow("", null).optional(),
});
