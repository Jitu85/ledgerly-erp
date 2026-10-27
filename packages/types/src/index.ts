import { z } from "zod";

export const emailSchema = z
  .email()
  .trim()
  .max(254)
  .transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(12).max(128);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  companyId: z.uuid().optional(),
});

export const registerSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  fullName: z.string().trim().min(2).max(160),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(512),
  password: passwordSchema,
});
export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(32).max(512).optional(),
});

export const changeMembershipRoleSchema = z.object({ roleId: z.uuid() });
export const changeMembershipStatusSchema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangeMembershipRoleInput = z.infer<typeof changeMembershipRoleSchema>;
export type ChangeMembershipStatusInput = z.infer<typeof changeMembershipStatusSchema>;

export type ApiError = {
  code: string;
  message: string;
  correlationId: string;
  fieldErrors?: Record<string, string[]>;
};

export type SessionResult = {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  expiresIn: number;
};

export * from "./inventory.js";
export * from "./purchase.js";
export * from "./sales.js";
