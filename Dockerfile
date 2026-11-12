# Production Dockerfile for Ledgerly ERP API
FROM node:24-slim AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# Copy monorepo configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY database/ ./database/
COPY apps/api/ ./apps/api/

# Install dependencies and build libraries & API
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @erp/database build
RUN pnpm --filter @erp/types build
RUN pnpm --filter @erp/api build

# Runner stage
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=4000
ENV PORT=4000

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

COPY --from=builder /app /app

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
