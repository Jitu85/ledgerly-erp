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

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
});

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const adminResetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export const inviteCompanyUserSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(2).max(160),
  roleId: z.uuid(),
  temporaryPassword: passwordSchema.optional(),
});

export const adminUpdateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(160).optional(),
  roleId: z.uuid().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangeMembershipRoleInput = z.infer<typeof changeMembershipRoleSchema>;
export type ChangeMembershipStatusInput = z.infer<typeof changeMembershipStatusSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
export type InviteCompanyUserInput = z.infer<typeof inviteCompanyUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

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
export * from "./accounting.js";
export * from "./expenses.js";
export * from "./support.js";
