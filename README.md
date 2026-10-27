# Multi-Tenant ERP Platform

Phase 2 establishes the engineering foundation for a secure multi-tenant web ERP. It intentionally contains no inventory, purchase, sales, accounting, payroll, or reporting modules.

## Non-negotiable rules

- A company is a tenant, and tenant-owned data is always company-scoped.
- The server enforces membership, role, permission, and tenant context; hiding UI is not authorization.
- Passwords use Argon2id. Session, verification, and reset credentials are stored only as hashes.
- Audit history is append-only.
- Future stock changes must append stock-ledger entries; future financial changes must post balanced journals.
- Business rules live outside UI components and transport controllers.

See [AGENTS.md](AGENTS.md) before editing. Product and architecture documents are indexed in `docs/`; the implementation selection is in `docs/12-implementation-stack-lock.md` and unresolved decisions are in `docs/11-open-decisions-and-conflicts.md`.

## Repository layout

```text
apps/
  api/       NestJS/Fastify versioned API
  web/       Next.js responsive application shell
  worker/    BullMQ worker foundation
packages/
  config/    Shared strict TypeScript configuration
  types/     Validated API contracts
  ui/        Reusable presentational components
database/    Drizzle schema, migrations, and seed data
docker/      Local PostgreSQL and Redis configuration
tests/       Cross-application security and browser test home
scripts/     Cross-platform automation home
docs/        Product, architecture, security, and decision records
```

## Prerequisites

- Node.js 24 or newer
- Corepack (included with the tested Node installation) and pnpm 11.9.0
- Docker Desktop with Compose for local PostgreSQL and Redis
- Git

## Windows development setup

Run these commands from PowerShell in the repository root:

```powershell
Copy-Item .env.example .env
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install

docker compose --env-file .env -f docker/compose.local.yml up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`. The API health endpoint is `http://localhost:4000/api/v1/health` and OpenAPI documentation is at `http://localhost:4000/api/v1/docs`.

The `.env.example` values are local placeholders, not production credentials. Generate a unique `JWT_ACCESS_SECRET` before using the authentication API. Production secrets must be stored in a managed secret service.

## Database commands

```powershell
# Generate a reviewed migration after changing database/src/schema.ts
pnpm db:generate

# Apply committed migrations
pnpm db:migrate

# Seed stable permission codes and platform defaults
pnpm db:seed
```

Migrations use `DATABASE_URL`. Runtime identity/onboarding access uses `PLATFORM_DATABASE_URL`; tenant-scoped operations use `TENANT_DATABASE_URL` and establish a transaction-local company context. Local development may point them at one database user, but production must use separate least-privileged roles that cannot bypass RLS.

## Quality commands

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build

# Combined local gate
pnpm quality
```

The integration command includes the API health suite. PostgreSQL RLS and Redis/Testcontainers suites require Docker and are added as persistence-backed capabilities are implemented.

## Authentication foundation

The API provides registration, login, refresh rotation, logout, password-reset request/completion, account lockout, secure cookies, rate limiting, CSRF enforcement for authenticated cookie mutations, tenant context, permission guards, audit events, and company-user role/status management.

A managed OIDC/MFA provider is still the production target. The current credential flow is intentionally isolated behind authentication services so it can be replaced; see conflict C-002 in `docs/11-open-decisions-and-conflicts.md`.

## Intentionally not built

- Inventory, stock, packaging, warehouse, purchase, sales, expense, accounting, payroll, employee, customer, or supplier features
- Business reports, dashboards with live business metrics, or exports
- Posting engines, stock ledgers, journal ledgers, valuation, taxation, or payroll rules
- Production email delivery, managed OIDC/MFA, object uploads, subscription billing, or cloud infrastructure
- Production support access and break-glass workflows

Those capabilities must follow the documented vertical-slice order after their business decisions are approved.
