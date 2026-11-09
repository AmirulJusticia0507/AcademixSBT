import type { NextFunction, Request, Response } from "express";
import { TooManyRequestsError } from "../lib/errors";

/**
 * Rate limiter in-memory sederhana per IP (fixed window).
 * Cukup untuk PoC single-instance; untuk multi-instance ganti dengan Redis.
 */
export function rateLimit(options: { windowMs?: number; max?: number } = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 120;
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(max - 1));
      next();
      return;
    }

    entry.count += 1;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      next(new TooManyRequestsError("Terlalu banyak request, coba lagi nanti"));
      return;
    }
    next();
  };
}
