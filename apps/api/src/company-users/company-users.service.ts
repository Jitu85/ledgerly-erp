import { and, eq, isNull } from "drizzle-orm";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { auditLogs, companyUsers, roles, users } from "@erp/database/schema";
import type { ChangeMembershipRoleInput, ChangeMembershipStatusInput } from "@erp/types";
import { DatabaseService } from "../database/database.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";

@Injectable()
export class CompanyUsersService {
  constructor(private readonly database: DatabaseService) {}

  list(companyId: string) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select({
          id: companyUsers.id,
          email: users.email,
          fullName: users.fullName,
          status: companyUsers.status,
          roleId: roles.id,
          roleName: roles.name,
        })
        .from(companyUsers)
        .innerJoin(users, eq(users.id, companyUsers.userId))
        .innerJoin(roles, eq(roles.id, companyUsers.roleId))
        .where(and(eq(companyUsers.companyId, companyId), isNull(companyUsers.deletedAt))),
    );
  }

  async changeRole(
    companyId: string,
    membershipId: string,
    input: ChangeMembershipRoleInput,
    actorId: string,
    meta: RequestMetadata,
  ): Promise<void> {
    await this.database.withTenant(companyId, async (tx) => {
      const [target] = await tx
        .select({
          id: companyUsers.id,
          roleId: companyUsers.roleId,
          protectedRole: roles.isProtected,
        })
        .from(companyUsers)
        .innerJoin(roles, eq(roles.id, companyUsers.roleId))
        .where(
          and(
            eq(companyUsers.id, membershipId),
            eq(companyUsers.companyId, companyId),
            isNull(companyUsers.deletedAt),
          ),
        )
        .limit(1);
      const [newRole] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(
          and(eq(roles.id, input.roleId), eq(roles.companyId, companyId), isNull(roles.deletedAt)),
        )
        .limit(1);
      if (!target || !newRole)
        throw new NotFoundException({
          code: "RESOURCE_NOT_FOUND",
          message: "Company user was not found",
        });
      if (target.protectedRole)
        throw new BadRequestException({
          code: "PROTECTED_ROLE",
          message: "Protected ownership access cannot be changed through this endpoint",
        });
      await tx
        .update(companyUsers)
        .set({ roleId: input.roleId, updatedAt: new Date() })
        .where(eq(companyUsers.id, membershipId));
      await tx.insert(auditLogs).values({
        companyId,
        actorUserId: actorId,
        action: "company_user.role_changed",
        outcome: "SUCCESS",
        targetType: "company_user",
        targetId: membershipId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { beforeRoleId: target.roleId, afterRoleId: input.roleId },
      });
    });
  }

  async changeStatus(
    companyId: string,
    membershipId: string,
    input: ChangeMembershipStatusInput,
    actorId: string,
    meta: RequestMetadata,
  ): Promise<void> {
    await this.database.withTenant(companyId, async (tx) => {
      const [target] = await tx
        .select({
          id: companyUsers.id,
          status: companyUsers.status,
          protectedRole: roles.isProtected,
        })
        .from(companyUsers)
        .innerJoin(roles, eq(roles.id, companyUsers.roleId))
        .where(
          and(
            eq(companyUsers.id, membershipId),
            eq(companyUsers.companyId, companyId),
            isNull(companyUsers.deletedAt),
          ),
        )
        .limit(1);
      if (!target)
        throw new NotFoundException({
          code: "RESOURCE_NOT_FOUND",
          message: "Company user was not found",
        });
      if (target.protectedRole)
        throw new BadRequestException({
          code: "PROTECTED_ROLE",
          message: "Protected ownership access cannot be suspended through this endpoint",
        });
      await tx
        .update(companyUsers)
        .set({
          status: input.status,
          suspendedAt: input.status === "SUSPENDED" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(companyUsers.id, membershipId));
      await tx.insert(auditLogs).values({
        companyId,
        actorUserId: actorId,
        action: "company_user.status_changed",
        outcome: "SUCCESS",
        targetType: "company_user",
        targetId: membershipId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { beforeStatus: target.status, afterStatus: input.status },
      });
    });
  }
}
