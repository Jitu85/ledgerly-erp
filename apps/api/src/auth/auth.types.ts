import type { FastifyRequest } from "fastify";
import type { AccessClaims } from "./token.service.js";

export type AuthenticatedRequest = FastifyRequest & {
  auth: AccessClaims;
  tenant?: { companyId: string; membershipId: string; roleId: string };
};

export type RequestMetadata = {
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
};

export function requestMetadata(request: FastifyRequest): RequestMetadata {
  const userAgent = request.headers["user-agent"];
  return {
    requestId: request.id,
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}
