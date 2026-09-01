import { handle } from "hono/vercel";
import app from "../src/app.js";

export const runtime = "nodejs";

export const GET = handle(app);
export const POST = async (req: Request) => {
  console.log("POST FUNCTION HIT:", req.url);

  return handle(app)(req);
};
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = async (req: Request) => {
  console.log("OPTIONS FUNCTION HIT:", req.url);

  return handle(app)(req);
};