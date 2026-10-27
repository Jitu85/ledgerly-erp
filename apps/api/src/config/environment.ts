import { z } from "zod";

export const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.url().default("http://localhost:3000"),
  PLATFORM_DATABASE_URL: z.string().min(1),
  TENANT_DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(32).default("development_jwt_access_secret_32chars_long!"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  SESSION_COOKIE_SECURE: z
    .string()
    .default("true")
    .transform((value) => value === "true"),
  // Neon Cloud Services
  DATABASE_URL: z.string().optional(),
  DATABASE_URL_UNPOOLED: z.string().optional(),
  NEON_BRANCH: z.string().optional(),
  NEON_AUTH_BASE_URL: z.string().optional(),
  NEON_AUTH_JWKS_URL: z.string().optional(),
  NEON_REALTIME_URL: z.string().optional(),
  NEON_REALTIME_SECRET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_ENDPOINT_URL_S3: z.string().optional(),
  AWS_REGION: z.string().optional(),
  NEON_OBJECT_STORAGE_BUCKET: z.string().default("assets"),
  NEON_FUNCTION_HELLO_BASE_URL: z.string().optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(input: Record<string, unknown>): Environment {
  const normalized: Record<string, unknown> = {
    ...input,
    API_PORT: input.API_PORT ?? input.PORT ?? 4000,
    PLATFORM_DATABASE_URL: input.PLATFORM_DATABASE_URL ?? input.DATABASE_URL,
    TENANT_DATABASE_URL: input.TENANT_DATABASE_URL ?? input.DATABASE_URL,
    DATABASE_URL: input.DATABASE_URL,
    DATABASE_URL_UNPOOLED: input.DATABASE_URL_UNPOOLED,
    NEON_BRANCH: input.NEON_BRANCH,
    NEON_AUTH_BASE_URL: input.NEON_AUTH_BASE_URL,
    NEON_AUTH_JWKS_URL: input.NEON_AUTH_JWKS_URL,
    NEON_REALTIME_URL: input.NEON_REALTIME_URL,
    NEON_REALTIME_SECRET: input.NEON_REALTIME_SECRET,
    AWS_ACCESS_KEY_ID: input.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: input.AWS_SECRET_ACCESS_KEY,
    AWS_ENDPOINT_URL_S3: input.AWS_ENDPOINT_URL_S3,
    AWS_REGION: input.AWS_REGION,
    NEON_OBJECT_STORAGE_BUCKET: input.NEON_OBJECT_STORAGE_BUCKET ?? "assets",
    NEON_FUNCTION_HELLO_BASE_URL: input.NEON_FUNCTION_HELLO_BASE_URL,
  };
  const parsed = environmentSchema.safeParse(normalized);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  return parsed.data;
}
