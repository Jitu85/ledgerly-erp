import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { TokenService } from "./token.service.js";
import type { AuthenticatedRequest } from "./auth.types.js";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const bearer = request.headers.authorization?.startsWith("Bearer ")
      ? request.headers.authorization.slice(7)
      : undefined;
    const raw = bearer ?? request.cookies.erp_access_token;
    if (!raw)
      throw new UnauthorizedException({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required",
      });
    try {
      (request as AuthenticatedRequest).auth = await this.tokens.verifyAccessToken(raw);
      return true;
    } catch {
      throw new UnauthorizedException({
        code: "AUTHENTICATION_REQUIRED",
        message: "Session is invalid or expired",
      });
    }
  }
}
