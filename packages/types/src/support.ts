import { z } from "zod";

export const supportMessageCategorySchema = z.enum([
  "ACCOUNT",
  "BUG",
  "ACCESS",
  "BILLING",
  "GENERAL",
]);

export const supportMessagePrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const supportMessageStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);

export const sendSupportMessageSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(5).max(2000),
  category: supportMessageCategorySchema.default("GENERAL"),
  priority: supportMessagePrioritySchema.default("NORMAL"),
});

export const replySupportMessageSchema = z.object({
  reply: z.string().trim().min(1).max(2000),
  status: supportMessageStatusSchema.optional(),
});

export const updateSupportMessageStatusSchema = z.object({
  status: supportMessageStatusSchema,
});

export type SupportMessageCategory = z.infer<typeof supportMessageCategorySchema>;
export type SupportMessagePriority = z.infer<typeof supportMessagePrioritySchema>;
export type SupportMessageStatus = z.infer<typeof supportMessageStatusSchema>;
export type SendSupportMessageInput = z.infer<typeof sendSupportMessageSchema>;
export type ReplySupportMessageInput = z.infer<typeof replySupportMessageSchema>;
export type UpdateSupportMessageStatusInput = z.infer<typeof updateSupportMessageStatusSchema>;

export type SupportMessageDto = {
  id: string;
  companyId: string;
  userId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  category: SupportMessageCategory;
  priority: SupportMessagePriority;
  status: SupportMessageStatus;
  adminReply: string | null;
  repliedBy: string | null;
  repliedByName: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
