export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const NotFound = (entity: string): ApiError =>
  new ApiError(404, "NOT_FOUND", `${entity} not found`);

export const Conflict = (message: string, details?: unknown): ApiError =>
  new ApiError(409, "CONFLICT", message, details);

export const Forbidden = (message = "You don't have permission to do this"): ApiError =>
  new ApiError(403, "FORBIDDEN", message);

export const Unauthorized = (message = "Authentication required"): ApiError =>
  new ApiError(401, "UNAUTHORIZED", message);

export const BadRequest = (message: string, details?: unknown): ApiError =>
  new ApiError(400, "BAD_REQUEST", message, details);

export const TooManyRequests = (message = "Too many requests"): ApiError =>
  new ApiError(429, "RATE_LIMITED", message);