import { and, eq, isNull, sql } from "drizzle-orm";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  auditLogs,
  companyUsers,
  passwordResetTokens,
  roles,
  users,
  userSessions,
} from "@erp/database/schema";
import type {
  AdminResetPasswordInput,
  AdminUpdateUserInput,
  ChangeMembershipRoleInput,
  ChangeMembershipStatusInput,
  InviteCompanyUserInput,
} from "@erp/types";
import { randomBytes, randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service.js";
import { PasswordService } from "../auth/password.service.js";
import { TokenService } from "../auth/token.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";

@Injectable()
export class CompanyUsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  list(companyId: string) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select({
          id: companyUsers.id,
          userId: users.id,
          email: users.email,
          fullName: users.fullName,
          status: companyUsers.status,
          userStatus: users.status,
          roleId: roles.id,
          roleName: roles.name,
          roleCode: roles.code,
          isProtectedRole: roles.isProtected,
          failedLoginAttempts: users.failedLoginAttempts,
          lockedUntil: users.lockedUntil,
          lastLoginAt: users.lastLoginAt,
          emailVerifiedAt: users.emailVerifiedAt,
          createdAt: companyUsers.createdAt,
        })
        .from(companyUsers)
        .innerJoin(users, eq(users.id, companyUsers.userId))
        .innerJoin(roles, eq(roles.id, companyUsers.roleId))
        .where(and(eq(companyUsers.companyId, companyId), isNull(companyUsers.deletedAt))),
    );
  }

  getRoles(companyId: string) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select({
          id: roles.id,
          code: roles.code,
          name: roles.name,
          description: roles.description,
          isProtected: roles.isProtected,
        })
        .from(roles)
        .where(and(eq(roles.companyId, companyId), isNull(roles.deletedAt))),
    );
  }

  async inviteUser(
    companyId: string,
    input: InviteCompanyUserInput,
    actorId: string,
    meta: RequestMetadata,
  ): Promise<{ membershipId: string; userId: string; email: string; temporaryPassword?: string }> {
    return this.database.withTenant(companyId, async (tx) => {
      const [role] = await tx
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(
          and(eq(roles.id, input.roleId), eq(roles.companyId, companyId), isNull(roles.deletedAt)),
        )
        .limit(1);

      if (!role) {
        throw new NotFoundException({
          code: "ROLE_NOT_FOUND",
          message: "Selected role does not exist in this company",
        });
      }

      const existingUsers = await tx
        .select()
        .from(users)
        .where(
          and(sql`lower(${users.email}) = ${input.email.toLowerCase()}`, isNull(users.deletedAt)),
        )
        .limit(1);

      let existingUser = existingUsers[0];
      let generatedPassword: string | undefined;

      if (!existingUser) {
        const tempPass = input.temporaryPassword ?? `TempPass!${randomBytes(4).toString("hex")}`;
        generatedPassword = tempPass;
        const hash = await this.passwords.hash(tempPass);
        const newUserId = randomUUID();
        const [createdUser] = await tx
          .insert(users)
          .values({
            id: newUserId,
            email: input.email.toLowerCase(),
            fullName: input.fullName,
            passwordHash: hash,
            status: "ACTIVE",
          })
          .returning();
        existingUser = createdUser;
      }

      if (!existingUser) {
        throw new BadRequestException("Could not provision user account");
      }

      // Check if already in company
      const [existingMember] = await tx
        .select({ id: companyUsers.id, status: companyUsers.status })
        .from(companyUsers)
        .where(
          and(
            eq(companyUsers.companyId, companyId),
            eq(companyUsers.userId, existingUser.id),
            isNull(companyUsers.deletedAt),
          ),
        )
        .limit(1);

      if (existingMember) {
        throw new BadRequestException({
          code: "USER_ALREADY_MEMBER",
          message: "User is already a member of this company",
        });
      }

      const membershipId = randomUUID();
      await tx.insert(companyUsers).values({
        id: membershipId,
        companyId,
        userId: existingUser.id,
        roleId: input.roleId,
        status: "ACTIVE",
        invitedBy: actorId,
        activatedAt: new Date(),
      });

      await tx.insert(auditLogs).values({
        companyId,
        actorUserId: actorId,
        action: "company_user.invited",
        outcome: "SUCCESS",
        targetType: "company_user",
        targetId: membershipId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { email: input.email, roleId: input.roleId },
      });

      return {
        membershipId,
        userId: existingUser.id,
        email: existingUser.email,
        ...(generatedPassword ? { temporaryPassword: generatedPassword } : {}),
      };
    });
  }

  async adminResetPassword(
    companyId: string,
    membershipId: string,
    input: AdminResetPasswordInput,
    actorId: string,
    meta: RequestMetadata,
  ): Promise<{ status: "reset" }> {
    return this.database.withTenant(companyId, async (tx) => {
      const [member] = await tx
        .select({
          id: companyUsers.id,
          userId: companyUsers.userId,
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

      if (!member) {
        throw new NotFoundException({
          code: "RESOURCE_NOT_FOUND",
          message: "Company user was not found",
        });
      }

      const newHash = await this.passwords.hash(input.newPassword);
      await tx
        .update(users)
        .set({
          passwordHash: newHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, member.userId));

      await tx
        .update(userSessions)
        .set({ status: "REVOKED", revokedAt: new Date(), revokeReason: "admin_password_reset" })
        .where(and(eq(userSessions.userId, member.userId), eq(userSessions.status, "ACTIVE")));

      await tx.insert(auditLogs).values({
        companyId,
        actorUserId: actorId,
        action: "company_user.password_reset",
        outcome: "SUCCESS",
        targetType: "company_user",
        targetId: membershipId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { targetUserId: member.userId },
      });

      return { status: "reset" };
    });
  }

  async generatePassword(
    companyId: string,
    membershipId: string,
    actorId: string,
    meta: RequestMetadata,
  ): Promise<{ generatedPassword: string }> {
    return this.database.withTenant(companyId, async (tx) => {
      const [member] = await tx
        .select({
          id: companyUsers.id,
          userId: companyUsers.userId,
        })
        .from(companyUsers)
        .where(
          and(
            eq(companyUsers.id, membershipId),
            eq(companyUsers.companyId, companyId),
            isNull(companyUsers.deletedAt),
          ),
        )
        .limit(1);

      if (!member) {
        throw new NotFoundException({
          code: "RESOURCE_NOT_FOUND",
          message: "Company user was not found",
        });
      }

      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
      let generatedPassword = "";
      const randomBytesBuffer = randomBytes(16);
      for (let i = 0; i < 16; i++) {
        const byte = randomBytesBuffer[i] ?? 0;
        generatedPassword += chars.charAt(byte % chars.length);
      }

      const newHash = await this.passwords.hash(generatedPassword);
      await tx
        .update(users)
        .set({
          passwordHash: newHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, member.userId));

      await tx
        .update(userSessions)
        .set({
          status: "REVOKED",
          revokedAt: new Date(),
          revokeReason: "admin_password_generated",
        })
        .where(and(eq(userSessions.userId, member.userId), eq(userSessions.status, "ACTIVE")));

      await tx.insert(auditLogs).values({
        companyId,
        actorUserId: actorId,
        action: "company_user.password_generated",
        outcome: "SUCCESS",
        targetType: "company_user",
        targetId: membershipId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { targetUserId: member.userId },
      });

      return { generatedPassword };
    });
  }

  async unlockUser(
    companyId: string,
    membershipId: string,
    actorId: string,
    meta: RequestMetadata,
  ): Promise<{ status: "unlocked" }> {
    return this.database.withTenant(companyId, async (tx) => {
      const [member] = await tx
        .select({
          id: companyUsers.id,
          userId: companyUsers.userId,
        })
        .from(companyUsers)
        .where(
          and(
            eq(companyUsers.id, membershipId),
            eq(companyUsers.companyId, companyId),
            isNull(companyUsers.deletedAt),
          ),
        )
        .limit(1);

      if (!member) {
        throw new NotFoundException({
          code: "RESOURCE_NOT_FOUND",
          message: "Company user was not found",
        });
      }

      await tx
        .update(users)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, member.userId));

      await tx.insert(auditLogs).values({
        companyId,
        actorUserId: actorId,
        action: "company_user.unlocked",
        outcome: "SUCCESS",
        targetType: "company_user",
        targetId: membershipId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { targetUserId: member.userId },
      });

      return { status: "unlocked" };
    });
  }

  async createResetLink(
    companyId: string,
    membershipId: string,
    actorId: string,
    meta: RequestMetadata,
  ): Promise<{ resetToken: string; expiresAt: Date }> {
    return this.database.withTenant(companyId, async (tx) => {
      const [member] = await tx
        .select({
          id: companyUsers.id,
          userId: companyUsers.userId,
        })
        .from(companyUsers)
        .where(
          and(
            eq(companyUsers.id, membershipId),
            eq(companyUsers.companyId, companyId),
            isNull(companyUsers.deletedAt),
          ),
        )
        .limit(1);

      if (!member) {
        throw new NotFoundException({
          code: "RESOURCE_NOT_FOUND",
          message: "Company user was not found",
        });
      }

      const id = randomUUID();
      const token = this.tokens.issueOpaqueToken(id);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60_000); // 24 hours

      await tx.insert(passwordResetTokens).values({
        id,
        userId: member.userId,
        tokenHash: token.hash,
        expiresAt,
        requestedIp: meta.ipAddress,
      });

      await tx.insert(auditLogs).values({
        companyId,
        actorUserId: actorId,
        action: "company_user.reset_link_created",
        outcome: "SUCCESS",
        targetType: "company_user",
        targetId: membershipId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { targetUserId: member.userId },
      });

      return { resetToken: token.raw, expiresAt };
    });
  }

  async updateDetails(
    companyId: string,
    membershipId: string,
    input: AdminUpdateUserInput,
    actorId: string,
    meta: RequestMetadata,
  ): Promise<{ status: "updated" }> {
    return this.database.withTenant(companyId, async (tx) => {
      const [member] = await tx
        .select({
          id: companyUsers.id,
          userId: companyUsers.userId,
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

      if (!member) {
        throw new NotFoundException({
          code: "RESOURCE_NOT_FOUND",
          message: "Company user was not found",
        });
      }

      if (input.fullName) {
        await tx
          .update(users)
          .set({ fullName: input.fullName, updatedAt: new Date() })
          .where(eq(users.id, member.userId));
      }

      if (input.roleId && input.roleId !== member.roleId) {
        if (member.protectedRole) {
          throw new BadRequestException({
            code: "PROTECTED_ROLE",
            message: "Protected ownership role cannot be changed",
          });
        }
        await tx
          .update(companyUsers)
          .set({ roleId: input.roleId, updatedAt: new Date() })
          .where(eq(companyUsers.id, membershipId));
      }

      if (input.status) {
        if (member.protectedRole) {
          throw new BadRequestException({
            code: "PROTECTED_ROLE",
            message: "Protected ownership role cannot be suspended",
          });
        }
        await tx
          .update(companyUsers)
          .set({
            status: input.status,
            suspendedAt: input.status === "SUSPENDED" ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(companyUsers.id, membershipId));
      }

      await tx.insert(auditLogs).values({
        companyId,
        actorUserId: actorId,
        action: "company_user.details_updated",
        outcome: "SUCCESS",
        targetType: "company_user",
        targetId: membershipId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { ...input },
      });

      return { status: "updated" };
    });
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
