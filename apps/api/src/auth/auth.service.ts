import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  auditLogs,
  companies,
  companyUsers,
  emailVerificationTokens,
  passwordResetTokens,
  permissions,
  rolePermissions,
  roles,
  users,
  userSessions,
} from "@erp/database/schema";
import type {
  ChangeOwnPasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SessionResult,
  UpdateProfileInput,
} from "@erp/types";
import { randomBytes, randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service.js";
import { AuditService } from "../audit/audit.service.js";
import { PasswordService } from "./password.service.js";
import { TokenService } from "./token.service.js";
import type { RequestMetadata } from "./auth.types.js";

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterInput, meta: RequestMetadata): Promise<SessionResult> {
    const passwordHash = await this.passwords.hash(input.password);
    const userId = randomUUID();
    const companyId = randomUUID();
    const roleId = randomUUID();
    const verificationId = randomUUID();
    const verification = this.tokens.issueOpaqueToken(verificationId);
    const slug = `${
      input.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "company"
    }-${randomBytes(3).toString("hex")}`;

    try {
      await this.database.platform.transaction(async (tx) => {
        const existing = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(sql`lower(${users.email}) = ${input.email}`, isNull(users.deletedAt)))
          .limit(1);
        if (existing.length > 0)
          throw new ConflictException({
            code: "REGISTRATION_UNAVAILABLE",
            message: "This account cannot be registered",
          });
        await tx
          .insert(users)
          .values({ id: userId, email: input.email, fullName: input.fullName, passwordHash });
        await tx.insert(companies).values({ id: companyId, name: input.companyName, slug });
        await tx.insert(roles).values({
          id: roleId,
          companyId,
          code: "COMPANY_OWNER",
          name: "Company Owner",
          description: "Protected company ownership role",
          isProtected: true,
        });
        await tx
          .insert(companyUsers)
          .values({ companyId, userId, roleId, status: "ACTIVE", activatedAt: new Date() });
        const grants = await tx.select({ id: permissions.id }).from(permissions);
        if (grants.length > 0)
          await tx
            .insert(rolePermissions)
            .values(
              grants.map(({ id }) => ({ companyId, roleId, permissionId: id, grantedBy: userId })),
            );
        await tx.insert(emailVerificationTokens).values({
          id: verificationId,
          userId,
          tokenHash: verification.hash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        await tx.insert(auditLogs).values([
          {
            companyId,
            actorUserId: userId,
            action: "company.created",
            outcome: "SUCCESS",
            targetType: "company",
            targetId: companyId,
            requestId: meta.requestId,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            metadata: {},
          },
          {
            companyId,
            actorUserId: userId,
            action: "auth.registered",
            outcome: "SUCCESS",
            targetType: "user",
            targetId: userId,
            requestId: meta.requestId,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            metadata: {},
          },
        ]);
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw error;
    }
    return this.login({ email: input.email, password: input.password, companyId }, meta);
  }

  async login(input: LoginInput, meta: RequestMetadata): Promise<SessionResult> {
    const [user] = await this.database.platform
      .select()
      .from(users)
      .where(and(sql`lower(${users.email}) = ${input.email}`, isNull(users.deletedAt)))
      .limit(1);
    if (!user?.passwordHash) {
      await this.passwords.hash(input.password);
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect",
      });
    }
    if (user.status !== "ACTIVE" || (user.lockedUntil && user.lockedUntil > new Date())) {
      await this.audit.record({
        action: "auth.login.blocked",
        outcome: "DENIED",
        targetType: "user",
        targetId: user.id,
        actorUserId: user.id,
        reason: "account_ineligible",
        ...meta,
      });
      throw new UnauthorizedException({
        code: "ACCOUNT_UNAVAILABLE",
        message: "This account is temporarily unavailable",
      });
    }
    const valid = await this.passwords.verify(user.passwordHash, input.password);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      await this.database.platform
        .update(users)
        .set({
          failedLoginAttempts: attempts,
          lockedUntil:
            attempts >= LOCKOUT_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      await this.audit.record({
        action: "auth.login.failed",
        outcome: "FAILURE",
        targetType: "user",
        targetId: user.id,
        actorUserId: user.id,
        reason: "invalid_credentials",
        ...meta,
      });
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect",
      });
    }

    const membershipRows = await this.database.platform
      .select({
        membershipId: companyUsers.id,
        companyId: companyUsers.companyId,
        companyStatus: companies.status,
      })
      .from(companyUsers)
      .innerJoin(companies, eq(companies.id, companyUsers.companyId))
      .where(
        and(
          eq(companyUsers.userId, user.id),
          eq(companyUsers.status, "ACTIVE"),
          isNull(companyUsers.deletedAt),
          ...(input.companyId ? [eq(companyUsers.companyId, input.companyId)] : []),
        ),
      )
      .limit(1);
    const membership = membershipRows[0];
    if (user.platformRole !== "SUPER_ADMIN" && !membership)
      throw new UnauthorizedException({
        code: "TENANT_CONTEXT_INVALID",
        message: "No active company membership is available",
      });
    if (membership?.companyStatus === "SUSPENDED" || membership?.companyStatus === "CLOSED")
      throw new UnauthorizedException({
        code: "TENANT_CONTEXT_INVALID",
        message: "The company is not available",
      });

    await this.database.platform
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    const session = await this.createSession(
      user.id,
      user.platformRole,
      membership?.companyId,
      meta,
    );
    const sessionId = this.tokens.getTokenId(session.refreshToken);
    await this.audit.record({
      ...(membership ? { companyId: membership.companyId } : {}),
      actorUserId: user.id,
      action: "auth.login.succeeded",
      outcome: "SUCCESS",
      targetType: "session",
      ...(sessionId ? { targetId: sessionId } : {}),
      ...meta,
    });
    return session;
  }

  private async createSession(
    userId: string,
    role: "NONE" | "SUPER_ADMIN",
    companyId: string | undefined,
    meta: RequestMetadata,
  ): Promise<SessionResult> {
    const sessionId = randomUUID();
    const refresh = this.tokens.issueOpaqueToken(sessionId);
    const family = randomUUID();
    const expiresAt = new Date(
      Date.now() + this.config.getOrThrow<number>("REFRESH_TOKEN_TTL_DAYS") * 86_400_000,
    );
    await this.database.platform.insert(userSessions).values({
      id: sessionId,
      userId,
      ...(companyId ? { activeCompanyId: companyId } : {}),
      tokenHash: refresh.hash,
      tokenFamily: family,
      expiresAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    const accessToken = await this.tokens.signAccessToken({
      sub: userId,
      sid: sessionId,
      ...(companyId ? { companyId } : {}),
      platformRole: role,
    });
    return {
      accessToken,
      refreshToken: refresh.raw,
      csrfToken: randomBytes(24).toString("base64url"),
      expiresIn: this.config.getOrThrow<number>("ACCESS_TOKEN_TTL_SECONDS"),
    };
  }

  async refresh(raw: string, meta: RequestMetadata): Promise<SessionResult> {
    const sessionId = this.tokens.getTokenId(raw);
    if (!sessionId)
      throw new UnauthorizedException({ code: "INVALID_SESSION", message: "Session is invalid" });
    const [session] = await this.database.platform
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, sessionId))
      .limit(1);
    if (session?.status !== "ACTIVE" || session.expiresAt <= new Date())
      throw new UnauthorizedException({
        code: "INVALID_SESSION",
        message: "Session is invalid or expired",
      });
    if (session.previousTokenHash && this.tokens.matches(raw, session.previousTokenHash)) {
      await this.database.platform
        .update(userSessions)
        .set({ status: "REVOKED", revokedAt: new Date(), revokeReason: "refresh_token_reuse" })
        .where(eq(userSessions.tokenFamily, session.tokenFamily));
      await this.audit.record({
        actorUserId: session.userId,
        action: "auth.session.reuse_detected",
        outcome: "DENIED",
        targetType: "session",
        targetId: session.id,
        ...meta,
      });
      throw new UnauthorizedException({ code: "INVALID_SESSION", message: "Session is invalid" });
    }
    if (!this.tokens.matches(raw, session.tokenHash))
      throw new UnauthorizedException({ code: "INVALID_SESSION", message: "Session is invalid" });
    const [user] = await this.database.platform
      .select({ platformRole: users.platformRole, status: users.status })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (user?.status !== "ACTIVE")
      throw new UnauthorizedException({
        code: "ACCOUNT_UNAVAILABLE",
        message: "This account is unavailable",
      });
    const next = this.tokens.issueOpaqueToken(session.id);
    await this.database.platform
      .update(userSessions)
      .set({
        previousTokenHash: session.tokenHash,
        tokenHash: next.hash,
        lastSeenAt: new Date(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      })
      .where(eq(userSessions.id, session.id));
    const accessToken = await this.tokens.signAccessToken({
      sub: session.userId,
      sid: session.id,
      ...(session.activeCompanyId ? { companyId: session.activeCompanyId } : {}),
      platformRole: user.platformRole,
    });
    return {
      accessToken,
      refreshToken: next.raw,
      csrfToken: randomBytes(24).toString("base64url"),
      expiresIn: this.config.getOrThrow<number>("ACCESS_TOKEN_TTL_SECONDS"),
    };
  }

  async logout(raw: string | undefined, meta: RequestMetadata): Promise<void> {
    if (!raw) return;
    const sessionId = this.tokens.getTokenId(raw);
    if (!sessionId) return;
    const [session] = await this.database.platform
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, sessionId))
      .limit(1);
    if (!session || !this.tokens.matches(raw, session.tokenHash)) return;
    await this.database.platform
      .update(userSessions)
      .set({ status: "REVOKED", revokedAt: new Date(), revokeReason: "user_logout" })
      .where(eq(userSessions.id, session.id));
    await this.audit.record({
      ...(session.activeCompanyId ? { companyId: session.activeCompanyId } : {}),
      actorUserId: session.userId,
      action: "auth.logout",
      outcome: "SUCCESS",
      targetType: "session",
      targetId: session.id,
      ...meta,
    });
  }

  async getMe(
    userId: string,
    companyId?: string,
  ): Promise<{
    user: {
      id: string;
      email: string;
      fullName: string;
      platformRole: string;
      status: string;
      emailVerifiedAt: Date | null;
      lastLoginAt: Date | null;
      createdAt: Date;
    } | null;
    company: { id: string; name: string; slug: string; baseCurrency: string } | null;
    role: { membershipId: string; roleId: string; roleName: string } | null;
  }> {
    const [user] = await this.database.platform
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        platformRole: users.platformRole,
        status: users.status,
        emailVerifiedAt: users.emailVerifiedAt,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) return { user: null, company: null, role: null };

    let company = null;
    let role = null;
    if (companyId) {
      const [c] = await this.database.platform
        .select({
          id: companies.id,
          name: companies.name,
          slug: companies.slug,
          baseCurrency: companies.baseCurrency,
        })
        .from(companies)
        .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
        .limit(1);
      company = c ?? null;

      const [membership] = await this.database.platform
        .select({
          membershipId: companyUsers.id,
          roleId: roles.id,
          roleName: roles.name,
        })
        .from(companyUsers)
        .innerJoin(roles, eq(roles.id, companyUsers.roleId))
        .where(
          and(
            eq(companyUsers.userId, userId),
            eq(companyUsers.companyId, companyId),
            eq(companyUsers.status, "ACTIVE"),
            isNull(companyUsers.deletedAt),
          ),
        )
        .limit(1);
      role = membership ?? null;
    }

    return { user, company, role };
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
    meta: RequestMetadata,
  ): Promise<{ status: "updated"; fullName: string }> {
    await this.database.platform
      .update(users)
      .set({ fullName: input.fullName, updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));

    await this.audit.record({
      actorUserId: userId,
      action: "auth.profile.updated",
      outcome: "SUCCESS",
      targetType: "user",
      targetId: userId,
      ...meta,
      metadata: { fullName: input.fullName },
    });

    return { status: "updated", fullName: input.fullName };
  }

  async changePassword(
    userId: string,
    input: ChangeOwnPasswordInput,
    meta: RequestMetadata,
  ): Promise<{ status: "changed" }> {
    const [user] = await this.database.platform
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user?.passwordHash) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Account credentials could not be verified",
      });
    }

    const matches = await this.passwords.verify(user.passwordHash, input.currentPassword);
    if (!matches) {
      throw new BadRequestException({
        code: "CURRENT_PASSWORD_INCORRECT",
        message: "The current password provided is incorrect",
      });
    }

    const newHash = await this.passwords.hash(input.newPassword);
    await this.database.platform.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, userId));

      await tx
        .update(userSessions)
        .set({ status: "REVOKED", revokedAt: new Date(), revokeReason: "password_changed_by_user" })
        .where(and(eq(userSessions.userId, userId), eq(userSessions.status, "ACTIVE")));

      await tx.insert(auditLogs).values({
        actorUserId: userId,
        action: "auth.password.changed",
        outcome: "SUCCESS",
        targetType: "user",
        targetId: userId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {},
      });
    });

    return { status: "changed" };
  }

  async forgotPassword(input: ForgotPasswordInput, meta: RequestMetadata): Promise<void> {
    const [user] = await this.database.platform
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          sql`lower(${users.email}) = ${input.email}`,
          eq(users.status, "ACTIVE"),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    if (!user) return;
    const id = randomUUID();
    const token = this.tokens.issueOpaqueToken(id);
    await this.database.platform.insert(passwordResetTokens).values({
      id,
      userId: user.id,
      tokenHash: token.hash,
      expiresAt: new Date(Date.now() + 30 * 60_000),
      requestedIp: meta.ipAddress,
    });
    await this.audit.record({
      actorUserId: user.id,
      action: "auth.password_reset.requested",
      outcome: "SUCCESS",
      targetType: "user",
      targetId: user.id,
      ...meta,
    });
  }

  async resetPassword(input: ResetPasswordInput, meta: RequestMetadata): Promise<void> {
    const id = this.tokens.getTokenId(input.token);
    if (!id)
      throw new UnauthorizedException({
        code: "RESET_TOKEN_INVALID",
        message: "Reset link is invalid or expired",
      });
    const [token] = await this.database.platform
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.id, id),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!token || !this.tokens.matches(input.token, token.tokenHash))
      throw new UnauthorizedException({
        code: "RESET_TOKEN_INVALID",
        message: "Reset link is invalid or expired",
      });
    const passwordHash = await this.passwords.hash(input.password);
    await this.database.platform.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
        .where(eq(users.id, token.userId));
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, token.id));
      await tx
        .update(userSessions)
        .set({ status: "REVOKED", revokedAt: new Date(), revokeReason: "password_reset" })
        .where(and(eq(userSessions.userId, token.userId), eq(userSessions.status, "ACTIVE")));
      await tx.insert(auditLogs).values({
        actorUserId: token.userId,
        action: "auth.password_reset.completed",
        outcome: "SUCCESS",
        targetType: "user",
        targetId: token.userId,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {},
      });
    });
  }
}
