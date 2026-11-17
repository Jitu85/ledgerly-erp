import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  changeOwnPasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  type ChangeOwnPasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type SessionResult,
  type UpdateProfileInput,
} from "@erp/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { AccessTokenGuard } from "./access-token.guard.js";
import { AuthService } from "./auth.service.js";
import { requestMetadata, type AuthenticatedRequest } from "./auth.types.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get("me")
  @UseGuards(AccessTokenGuard)
  async me(@Req() request: AuthenticatedRequest) {
    return this.auth.getMe(request.auth.sub, request.auth.companyId);
  }

  @Patch("profile")
  @UseGuards(AccessTokenGuard)
  async updateProfile(
    @Body(new ZodValidationPipe(updateProfileSchema)) input: UpdateProfileInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.updateProfile(request.auth.sub, input, requestMetadata(request));
  }

  @Post("change-password")
  @UseGuards(AccessTokenGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(
    @Body(new ZodValidationPipe(changeOwnPasswordSchema)) input: ChangeOwnPasswordInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.changePassword(request.auth.sub, input, requestMetadata(request));
  }

  @Post("register")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) input: RegisterInput,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ status: "registered" }> {
    const session = await this.auth.register(input, requestMetadata(request));
    this.setSessionCookies(reply, session);
    return { status: "registered" };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ status: "authenticated" }> {
    const session = await this.auth.login(input, requestMetadata(request));
    this.setSessionCookies(reply, session);
    return { status: "authenticated" };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ status: "refreshed" }> {
    const raw = request.cookies.erp_refresh_token;
    if (!raw) return { status: "refreshed" };
    const session = await this.auth.refresh(raw, requestMetadata(request));
    this.setSessionCookies(reply, session);
    return { status: "refreshed" };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.auth.logout(request.cookies.erp_refresh_token, requestMetadata(request));
    this.clearSessionCookies(reply);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) input: ForgotPasswordInput,
    @Req() request: FastifyRequest,
  ): Promise<{ message: string }> {
    await this.auth.forgotPassword(input, requestMetadata(request));
    return { message: "If the account is eligible, password reset instructions will be sent." };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) input: ResetPasswordInput,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    await this.auth.resetPassword(input, requestMetadata(request));
  }

  private setSessionCookies(reply: FastifyReply, session: SessionResult): void {
    const secure = this.config.getOrThrow<boolean>("SESSION_COOKIE_SECURE");
    const common = { httpOnly: true, secure, sameSite: "lax" as const };
    reply.setCookie("erp_access_token", session.accessToken, {
      ...common,
      path: "/",
      maxAge: session.expiresIn,
    });
    reply.setCookie("erp_refresh_token", session.refreshToken, {
      ...common,
      sameSite: "strict",
      path: "/api/v1/auth",
      maxAge: this.config.getOrThrow<number>("REFRESH_TOKEN_TTL_DAYS") * 86_400,
    });
    reply.setCookie("erp_csrf_token", session.csrfToken, {
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: this.config.getOrThrow<number>("REFRESH_TOKEN_TTL_DAYS") * 86_400,
    });
  }

  private clearSessionCookies(reply: FastifyReply): void {
    reply.clearCookie("erp_access_token", { path: "/" });
    reply.clearCookie("erp_refresh_token", { path: "/api/v1/auth" });
    reply.clearCookie("erp_csrf_token", { path: "/" });
  }
}
