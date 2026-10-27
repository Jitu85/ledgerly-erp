import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const reply = context.getResponse<FastifyReply>();
    const status =
      error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = error instanceof HttpException ? error.getResponse() : null;
    const body =
      typeof response === "object" && response !== null
        ? (response as Record<string, unknown>)
        : {};
    const message =
      typeof body.message === "string"
        ? body.message
        : typeof response === "string"
          ? response
          : "Request failed";
    const safeMessage = status >= 500 ? "An unexpected error occurred" : message;
    const code =
      typeof body.code === "string"
        ? body.code
        : status === 404
          ? "RESOURCE_NOT_FOUND"
          : status === 401
            ? "AUTHENTICATION_REQUIRED"
            : status === 403
              ? "PERMISSION_DENIED"
              : status === 429
                ? "RATE_LIMITED"
                : "REQUEST_FAILED";
    void reply.status(status).send({
      code,
      message: safeMessage,
      correlationId: request.id,
      ...(body.fieldErrors ? { fieldErrors: body.fieldErrors } : {}),
    });
  }
}
