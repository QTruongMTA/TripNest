import Joi from "joi";

export const createPropertyBookingSchema = Joi.object({
  propertyId: Joi.string().required(),
  checkIn: Joi.date().iso().required(),
  checkOut: Joi.date().iso().greater(Joi.ref("checkIn")).required(),
  guests: Joi.number().integer().min(1).required(),
  ratePlanId: Joi.string().allow(null).optional(),
  promotionCode: Joi.string().allow("", null).optional(),
  notes: Joi.string().allow("", null).optional(),
});
