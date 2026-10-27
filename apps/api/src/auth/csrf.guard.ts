import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (safeMethods.has(request.method) || request.headers.authorization) return true;
    if (request.url.startsWith("/api/v1/auth/")) return true;
    const cookie = request.cookies.erp_csrf_token;
    const header = request.headers["x-csrf-token"];
    if (cookie && typeof header === "string" && cookie === header) return true;
    throw new ForbiddenException({
      code: "CSRF_VALIDATION_FAILED",
      message: "CSRF validation failed",
    });
  }
}
