import type { NextFunction, Request, Response } from "express";
import { extractApiKey } from "./auth";

export type Role = "admin" | "verifier" | "public";

/**
 * RBAC sederhana (P1):
 * - admin    : ADMIN_API_KEY  -> mint, revoke, audit, issuers
 * - verifier : VERIFIER_API_KEY (fallback admin) -> batch verification HRD
 * - public   : tanpa key -> verifikasi read-only per Token ID / wallet
 */
export function resolveRole(adminKey: string, verifierKey?: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = extractApiKey(req);
    if (key && key === adminKey) {
      (req as Request & { role?: Role }).role = "admin";
    } else if (key && verifierKey && key === verifierKey) {
      (req as Request & { role?: Role }).role = "verifier";
    } else if (key && key === adminKey) {
      (req as Request & { role?: Role }).role = "admin";
    } else {
      (req as Request & { role?: Role }).role = "public";
    }
    next();
  };
}
