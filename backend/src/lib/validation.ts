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
  // Validator ala PISN (opsional)
  accreditationStatus: z.string().trim().max(50).optional(),
  graduationStatus: z.string().trim().max(50).optional(),
  studyDurationYears: z.coerce.number().min(0).max(20).optional(),
  maxStudyDurationYears: z.coerce.number().min(1).max(20).optional(),
  creditsEarned: z.coerce.number().int().min(0).optional(),
  minCredits: z.coerce.number().int().min(0).optional(),
  gpa: z.coerce.number().min(0).max(4).optional(),
  minGpa: z.coerce.number().min(0).max(4).optional(),
  nik: z.string().trim().max(32).optional(),
  passportNumber: z.string().trim().max(32).optional(),
  activeReported: z
    .union([z.boolean(), z.enum(["true", "false"]), z.enum(["1", "0"])])
    .transform((v) => v === true || v === "true" || v === "1")
    .optional(),
  exceptionApproved: z
    .union([z.boolean(), z.enum(["true", "false"]), z.enum(["1", "0"])])
    .transform((v) => v === true || v === "true" || v === "1")
    .optional(),
  exceptionReason: z.string().trim().max(500).optional(),
  // P2: verval manual (lulusan lama / luar negeri / PT tutup)
  verificationMode: z.enum(["standard", "manual"]).optional(),
  manualVerificationType: z.enum(["legacy", "foreign", "closed_institution"]).optional(),
  manualVerifier: z.string().trim().min(2).max(255).optional(),
  manualVerificationReason: z.string().trim().min(10).max(1000).optional(),
}).superRefine((data, ctx) => {
  if (data.verificationMode === "manual") {
    if (!data.manualVerificationType) {
      ctx.addIssue({ code: "custom", message: "manualVerificationType wajib diisi untuk verval manual", path: ["manualVerificationType"] });
    }
    if (!data.manualVerifier) {
      ctx.addIssue({ code: "custom", message: "manualVerifier wajib diisi untuk verval manual", path: ["manualVerifier"] });
    }
    if (!data.manualVerificationReason) {
      ctx.addIssue({ code: "custom", message: "manualVerificationReason wajib diisi untuk verval manual", path: ["manualVerificationReason"] });
    }
  }
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

export const batchVerifySchema = z.object({
  tokenIds: z.array(tokenIdSchema).min(1).max(50),
});

export const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
