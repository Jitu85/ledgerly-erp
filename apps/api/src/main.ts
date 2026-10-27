import "reflect-metadata";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import { ConsoleLogger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { ApiExceptionFilter } from "./common/api-exception.filter.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );
  const config = app.get(ConfigService);
  app.useLogger(new ConsoleLogger({ json: true, colors: false }));
  await app.register(cookie);
  await app.register(helmet, { contentSecurityPolicy: false });
  app.enableCors({
    origin: config.getOrThrow<string>("WEB_ORIGIN"),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  const openApi = new DocumentBuilder()
    .setTitle("ERP Platform API")
    .setDescription(
      "Secure multi-tenant ERP and inventory API. Designed and Developed by ABHIJIT KUMAR MISRA",
    )
    .setVersion("1.0")
    .addCookieAuth("erp_access_token")
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApi);
  app
    .getHttpAdapter()
    .get("/api/v1/openapi.json", (_request: FastifyRequest, reply: FastifyReply) =>
      reply.send(openApiDocument),
    );
  await app.listen({ port: config.getOrThrow<number>("API_PORT"), host: "0.0.0.0" });
}

void bootstrap();
