import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../lib/errors";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/** Middleware API key sederhana untuk endpoint tulis/admin (P0). */
export function requireApiKey(expectedKey: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const provided =
      req.header("x-api-key") ??
      (req.header("authorization")?.startsWith("Bearer ")
        ? req.header("authorization")!.slice("Bearer ".length)
        : undefined);

    if (!provided || !safeEqual(provided, expectedKey)) {
      next(new UnauthorizedError());
      return;
    }
    next();
  };
}
