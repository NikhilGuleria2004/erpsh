import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { ApiError } from "../lib/errors.js";

export const errorHandler: ErrorHandler = (err, c) => {
  // Duck-typed check so we work even when the thrown value is from a
  // different module-instance of the ApiError class (which can happen with
  // some bundler / Hono re-export edge cases).
  if (err instanceof ApiError || (typeof err === "object" && err !== null && (err as { status?: unknown }).status && (err as { code?: unknown }).code)) {
    const e = err as ApiError;
    return c.json(
      { error: { code: e.code, message: e.message, details: e.details } },
      e.status as 400,
    );
  }
  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: err.flatten(),
        },
      },
      400,
    );
  }
  console.error(err);
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
    500,
  );
};

/** Hook for `@hono/zod-validator` that emits the same envelope as the global
 * error handler so all validation errors look identical to the client. */
import type { z } from "zod";
import type { Context } from "hono";

export const zodHook = (
  result:
    | { success: true; data: z.infer<z.ZodTypeAny> }
    | { success: false; error: z.ZodError },
  c: Context,
): Response | undefined => {
  if (!result.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: result.error.flatten(),
        },
      },
      400,
    ) as unknown as Response;
  }
  return undefined;
};