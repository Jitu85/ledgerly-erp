import { Injectable } from "@nestjs/common";
import { auditLogs } from "@erp/database/schema";
import { DatabaseService } from "../database/database.service.js";

export type AuditEvent = {
  companyId?: string;
  actorUserId?: string;
  action: string;
  outcome: "SUCCESS" | "FAILURE" | "DENIED";
  targetType: string;
  targetId?: string;
  reason?: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(private readonly database: DatabaseService) {}

  async record(event: AuditEvent): Promise<void> {
    await this.database.platform.insert(auditLogs).values({
      action: event.action,
      outcome: event.outcome,
      targetType: event.targetType,
      requestId: event.requestId,
      metadata: event.metadata ?? {},
      ...(event.companyId ? { companyId: event.companyId } : {}),
      ...(event.actorUserId ? { actorUserId: event.actorUserId } : {}),
      ...(event.targetId ? { targetId: event.targetId } : {}),
      ...(event.reason ? { reason: event.reason } : {}),
      ...(event.ipAddress ? { ipAddress: event.ipAddress } : {}),
      ...(event.userAgent ? { userAgent: event.userAgent } : {}),
    });
  }
}
