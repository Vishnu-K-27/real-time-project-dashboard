export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export function notFound(entity: string) {
  return new AppError(404, "NOT_FOUND", `${entity} was not found`);
}

export function forbidden(message = "You do not have access to this resource") {
  return new AppError(403, "FORBIDDEN", message);
}

export function unauthorized(message = "Authentication required") {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function conflict(message: string) {
  return new AppError(409, "CONFLICT", message);
}

export function badRequest(message: string, details?: unknown) {
  return new AppError(400, "BAD_REQUEST", message, details);
}
