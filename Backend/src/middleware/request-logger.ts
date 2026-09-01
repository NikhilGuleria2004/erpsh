import { randomUUID } from "node:crypto";
import type { MiddlewareHandler } from "hono";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
  }
}

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? randomUUID();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  const start = performance.now();
  await next();
  const ms = (performance.now() - start).toFixed(1);
  console.log(
    `[${requestId}] ${c.req.method} ${c.req.path} -> ${c.res.status} (${ms}ms)`,
  );
};