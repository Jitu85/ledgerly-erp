# Production Dockerfile for Ledgerly ERP API
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies and build libraries & API
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @erp/database build
RUN pnpm --filter @erp/types build
RUN pnpm --filter @erp/api build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app /app

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
