import type { RequestHandler, Response } from "express";
import type Joi from "joi";

type Source = "body" | "query";

/** Stores the cleaned value in res.locals, because Express 5 makes req.query read-only. */
/** Pass the route's params type, such as `{ id: string }`, when the route has any. */
export const validate =
  <Params = Record<string, never>>(schema: Joi.Schema, source: Source = "body"): RequestHandler<Params> =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });

    if (error) {
      next(error);
      return;
    }
    res.locals[source] = value;
    next();
  };

export function validated<T>(res: Response, source: Source = "body"): T {
  return res.locals[source] as T;
}
