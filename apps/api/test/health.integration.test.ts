process.env.NODE_ENV = "test";
process.env.API_PORT = "4000";
process.env.WEB_ORIGIN = "http://localhost:3000";
process.env.PLATFORM_DATABASE_URL = "postgresql://unused:unused@localhost:5432/unused";
process.env.TENANT_DATABASE_URL = "postgresql://unused:unused@localhost:5432/unused";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET = "01234567890123456789012345678901";
process.env.SESSION_COOKIE_SECURE = "false";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import cookie from "@fastify/cookie";

let app: NestFastifyApplication | undefined;

beforeAll(async () => {
  const { AppModule } = await import("../src/app.module.js");
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.register(cookie);
  app.setGlobalPrefix("api/v1");
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  if (app) await app.close();
});

describe("health endpoint", () => {
  it("returns a versioned healthy response without touching business dependencies", async () => {
    if (!app) throw new Error("Test application was not initialized");
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", service: "erp-api" });
  });
});
