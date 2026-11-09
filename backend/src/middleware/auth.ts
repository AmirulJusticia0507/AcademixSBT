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

/** Ambil API key dari header x-api-key atau Bearer token. */
export function extractApiKey(req: Request): string | undefined {
  return (
    req.header("x-api-key") ??
    (req.header("authorization")?.startsWith("Bearer ")
      ? req.header("authorization")!.slice("Bearer ".length)
      : undefined)
  );
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

/**
 * Tot untuk endpoint HRD: boleh pakai verifier key ATAU admin key.
 * Jika verifier key tidak diisi, fallback ke admin key.
 */
export function requireVerifierApiKey(verifierKey: string, adminKey: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const provided = extractApiKey(req);
    const expected = verifierKey || adminKey;
    if (!provided || (!safeEqual(provided, expected) && !safeEqual(provided, adminKey))) {
      next(new UnauthorizedError("API key HRD tidak valid"));
      return;
    }
    next();
  };
}
