import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Route ${req.method} ${req.path} tidak ditemukan`,
    },
  });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Input tidak valid",
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({
      error: {
        code: `UPLOAD_${error.code}`,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Ukuran berkas melebihi batas 10 MB"
            : `Upload gagal: ${error.message}`,
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
  console.error("[error]", error);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "production" ? "Terjadi kesalahan internal" : message,
    },
  });
}
