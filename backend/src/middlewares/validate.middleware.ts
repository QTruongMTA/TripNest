import type { NextFunction, Request, Response } from "express";
import type { ObjectSchema } from "joi";

export function validateMiddleware(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.details.map((detail) => detail.message).join(", "),
        },
      });
    }

    req.body = value;
    return next();
  };
}
