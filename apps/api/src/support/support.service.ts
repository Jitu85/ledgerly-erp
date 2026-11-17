import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Injectable, NotFoundException } from "@nestjs/common";
import { auditLogs, supportMessages, users } from "@erp/database";
import type {
  ReplySupportMessageInput,
  SendSupportMessageInput,
  SupportMessageDto,
  UpdateSupportMessageStatusInput,
} from "@erp/types";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";

@Injectable()
export class SupportService {
  constructor(private readonly database: DatabaseService) {}

  async sendMessage(
    companyId: string,
    userId: string,
    input: SendSupportMessageInput,
    meta: RequestMetadata,
  ): Promise<SupportMessageDto> {
    return this.database.withTenant(companyId, async (tx) => {
      const messageId = randomUUID();
      const [sender] = await tx
        .select({ id: users.id, fullName: users.fullName, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!sender) {
        throw new NotFoundException("Sender user not found");
      }

      await tx.insert(supportMessages).values({
        id: messageId,
        companyId,
        userId,
        subject: input.subject,
        message: input.message,
        category: input.category,
        priority: input.priority,
        status: "OPEN",
      });

      await tx.insert(auditLogs).values({
        companyId,
        actorUserId: userId,
        action: "support.message_sent",
        outcome: "SUCCESS",
        targetType: "support_message",
        targetId: messageId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { category: input.category, priority: input.priority },
      });

      const nowIso = new Date().toISOString();
      return {
        id: messageId,
        companyId,
        userId,
        senderName: sender.fullName,
        senderEmail: sender.email,
        subject: input.subject,
        message: input.message,
        category: input.category,
        priority: input.priority,
        status: "OPEN",
        adminReply: null,
        repliedBy: null,
        repliedByName: null,
        repliedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });
  }

  async listMessages(
    companyId: string,
    userId: string,
    isAdmin: boolean,
    filter?: { status?: string | undefined; category?: string | undefined },
  ): Promise<SupportMessageDto[]> {
    return this.database.withTenant(companyId, async (tx) => {
      const responder = alias(users, "responder");

      const conditions = [eq(supportMessages.companyId, companyId)];
      if (!isAdmin) {
        conditions.push(eq(supportMessages.userId, userId));
      }
      if (filter?.status) {
        conditions.push(eq(supportMessages.status, filter.status));
      }
      if (filter?.category) {
        conditions.push(eq(supportMessages.category, filter.category));
      }

      const rows = await tx
        .select({
          id: supportMessages.id,
          companyId: supportMessages.companyId,
          userId: supportMessages.userId,
          senderName: users.fullName,
          senderEmail: users.email,
          subject: supportMessages.subject,
          message: supportMessages.message,
          category: supportMessages.category,
          priority: supportMessages.priority,
          status: supportMessages.status,
          adminReply: supportMessages.adminReply,
          repliedBy: supportMessages.repliedBy,
          repliedByName: responder.fullName,
          repliedAt: supportMessages.repliedAt,
          createdAt: supportMessages.createdAt,
          updatedAt: supportMessages.updatedAt,
        })
        .from(supportMessages)
        .innerJoin(users, eq(users.id, supportMessages.userId))
        .leftJoin(responder, eq(responder.id, supportMessages.repliedBy))
        .where(and(...conditions))
        .orderBy(desc(supportMessages.createdAt));

      return rows.map((r) => ({
        ...r,
        category: r.category as SupportMessageDto["category"],
        priority: r.priority as SupportMessageDto["priority"],
        status: r.status as SupportMessageDto["status"],
        repliedAt: r.repliedAt ? r.repliedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    });
  }

  async getUnreadCount(
    companyId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<{ unreadCount: number; openCount: number }> {
    return this.database.withTenant(companyId, async (tx) => {
      if (isAdmin) {
        const rows = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(supportMessages)
          .where(and(eq(supportMessages.companyId, companyId), eq(supportMessages.status, "OPEN")));
        const openCount = rows[0]?.count ?? 0;
        return { unreadCount: openCount, openCount };
      } else {
        const rows = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(supportMessages)
          .where(
            and(
              eq(supportMessages.companyId, companyId),
              eq(supportMessages.userId, userId),
              eq(supportMessages.status, "OPEN"),
            ),
          );
        const openCount = rows[0]?.count ?? 0;
        return { unreadCount: openCount, openCount };
      }
    });
  }

  async replyMessage(
    companyId: string,
    messageId: string,
    input: ReplySupportMessageInput,
    actorId: string,
    meta: RequestMetadata,
  ): Promise<{ status: "replied" }> {
    return this.database.withTenant(companyId, async (tx) => {
      const [msg] = await tx
        .select({ id: supportMessages.id, status: supportMessages.status })
        .from(supportMessages)
        .where(and(eq(supportMessages.id, messageId), eq(supportMessages.companyId, companyId)))
        .limit(1);

      if (!msg) {
        throw new NotFoundException("Support message not found");
      }

      const nextStatus = input.status ?? "RESOLVED";
      const now = new Date();

      await tx
        .update(supportMessages)
        .set({
          adminReply: input.reply,
          repliedBy: actorId,
          repliedAt: now,
          status: nextStatus,
          updatedAt: now,
        })
        .where(eq(supportMessages.id, messageId));

      await tx.insert(auditLogs).values({
        companyId,
        actorUserId: actorId,
        action: "support.message_replied",
        outcome: "SUCCESS",
        targetType: "support_message",
        targetId: messageId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { status: nextStatus },
      });

      return { status: "replied" };
    });
  }

  async updateStatus(
    companyId: string,
    messageId: string,
    input: UpdateSupportMessageStatusInput,
    actorId: string,
    meta: RequestMetadata,
  ): Promise<{ status: "updated" }> {
    return this.database.withTenant(companyId, async (tx) => {
      const [msg] = await tx
        .select({ id: supportMessages.id, status: supportMessages.status })
        .from(supportMessages)
        .where(and(eq(supportMessages.id, messageId), eq(supportMessages.companyId, companyId)))
        .limit(1);

      if (!msg) {
        throw new NotFoundException("Support message not found");
      }

      await tx
        .update(supportMessages)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(supportMessages.id, messageId));

      await tx.insert(auditLogs).values({
        companyId,
        actorUserId: actorId,
        action: "support.status_updated",
        outcome: "SUCCESS",
        targetType: "support_message",
        targetId: messageId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { from: msg.status, to: input.status },
      });

      return { status: "updated" };
    });
  }
}
