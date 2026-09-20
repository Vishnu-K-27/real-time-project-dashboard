import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[source]);
    if (source === "query") {
      req.query = parsed as Request["query"];
    } else if (source === "params") {
      req.params = parsed as Request["params"];
    } else {
      req.body = parsed;
    }
    next();
  };
}
