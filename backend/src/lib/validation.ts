import { z } from "zod";

const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Alamat wallet harus 0x + 40 karakter hex");

const tokenIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Token ID harus angka bulat positif")
  .refine((value) => /^\d+$/.test(value) && BigInt(value) > 0n, "Token ID harus > 0");

export const mintDiplomaSchema = z.object({
  tokenId: tokenIdSchema,
  walletAddress: addressSchema,
  certificateNumber: z.string().trim().min(3).max(100),
  institutionCode: z.string().trim().min(2).max(20),
  institutionName: z.string().trim().min(2).max(255),
  nim: z.string().trim().min(3).max(50),
  fullName: z.string().trim().min(2).max(255),
  studyProgram: z.string().trim().min(2).max(100),
  degree: z.string().trim().min(1).max(50),
  graduationDate: z.string().trim().max(50).optional(),
});

export type MintDiplomaBody = z.infer<typeof mintDiplomaSchema>;

export const tokenIdParamSchema = z.object({
  tokenId: tokenIdSchema,
});

export const walletParamSchema = z.object({
  address: addressSchema,
});

export const issuerSchema = z.object({
  issuer: addressSchema,
});

export const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
