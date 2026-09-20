import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { config } from "../config";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.flatten(),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: config.nodeEnv === "production" ? "Something went wrong" : "Internal server error",
    },
  });
}
