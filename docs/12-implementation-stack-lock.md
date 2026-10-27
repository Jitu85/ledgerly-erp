# Implementation Stack Lock

## Status

This document locks the Phase 2 implementation baseline. Items marked **Locked** are direct selections from the agreed architecture. Items marked **Proposed** choose an exact tool where earlier documents specified only a category; they require ratification before production procurement.

## Stack

| Concern                | Decision                                                                                                                                             | Status                            | Rationale                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Language               | TypeScript with strict compiler settings                                                                                                             | Locked                            | Shared typed language across UI, API, workers, contracts, and scripts                                             |
| Frontend               | Next.js App Router with React                                                                                                                        | Locked                            | Matches `docs/06-system-architecture.md`; supports accessible responsive application shells and route protection  |
| UI styling             | Tailwind CSS with repository-owned accessible primitives and Lucide icons                                                                            | Proposed                          | Implements the documented Tailwind/accessibility direction without locking business logic into a component vendor |
| Backend                | NestJS modular monolith using the Fastify adapter                                                                                                    | Locked                            | Matches the documented module, validation, guard, OpenAPI, and performance direction                              |
| API                    | Versioned REST at `/api/v1`; separate platform routes at `/platform/v1`; OpenAPI                                                                     | Locked                            | Matches the documented API contract model                                                                         |
| Database               | PostgreSQL                                                                                                                                           | Locked                            | Authoritative transactional store with constraints and row-level security                                         |
| ORM/query layer        | Drizzle ORM plus SQL-first migrations and explicit SQL for RLS, ledgers, and complex reports                                                         | Proposed                          | Resolves the documented �Kysely or Drizzle-style� choice while keeping critical SQL reviewable                    |
| Authentication         | Replaceable authentication boundary; Phase 2 uses Argon2id credentials, short-lived JWT access cookies, and rotating opaque refresh sessions         | Proposed / conflict C-002         | Meets current security-control requirements while final managed OIDC/MFA selection remains open                   |
| Authorization          | NestJS guards and policy services combining platform role, active membership, company role, and permission codes; PostgreSQL RLS as defense in depth | Locked                            | Matches the documented tenant/RBAC model                                                                          |
| File storage           | S3-compatible object storage through a provider interface; local S3-compatible service may be added for development when file work starts            | Proposed                          | Vendor-neutral and consistent with the architecture; no attachment features are built in this phase               |
| Background jobs        | BullMQ workers backed by Redis, with idempotent handlers and a transactional outbox                                                                  | Locked                            | Matches the documented approach; only queue wiring is scaffolded in this phase                                    |
| Cache                  | Redis for short-lived cache, rate limits, coordination, and queues                                                                                   | Locked                            | Never authoritative for tenant permissions, stock, finance, or payroll                                            |
| Unit tests             | Vitest                                                                                                                                               | Proposed                          | Fast TypeScript-native test runner shared by packages, web, and API                                               |
| API integration tests  | Vitest plus Nest testing utilities and Testcontainers for PostgreSQL/Redis suites                                                                    | Proposed                          | Supports real dependency tests and tenant/RLS verification                                                        |
| Browser tests          | Playwright                                                                                                                                           | Locked category / Proposed runner | Matches the documented browser and accessibility testing direction                                                |
| Deployment targets     | Docker containers on a managed container platform; managed PostgreSQL, managed Redis, S3-compatible storage, CDN/WAF                                 | Proposed vendor-neutral target    | Architecture is locked; provider and region are open business decisions                                           |
| Infrastructure as code | Terraform                                                                                                                                            | Locked category                   | Matches the architecture; provider modules wait for cloud selection                                               |
| Package manager        | pnpm 11                                                                                                                                              | Proposed                          | Fast deterministic workspaces with one lockfile and good Windows support                                          |
| Repository model       | One monorepo                                                                                                                                         | Locked for Phase 2                | Keeps web, API, contracts, UI, configuration, migrations, and tests versioned together                            |
| Task orchestration     | Turborepo                                                                                                                                            | Proposed                          | Provides cacheable lint, type-check, test, and build tasks without defining deployment architecture               |
| CI                     | GitHub Actions                                                                                                                                       | Proposed                          | Runs installation, linting, type checking, tests, and build checks on pull requests                               |

## Repository Boundaries

- `apps/web`: Next.js company workspace and separate Super Admin routes.
- `apps/api`: NestJS modular monolith.
- `apps/worker`: reserved for BullMQ workers once the first background workflow is implemented.
- `packages/ui`: presentational components only.
- `packages/types`: validated cross-application contracts and stable shared types.
- `packages/config`: TypeScript, linting, formatting, and build conventions.
- `database`: Drizzle schema, migrations, and seed entry points.
- `tests`: cross-application and future end-to-end/security suites.
- `docker`: local dependency configuration.

## Dependency Rationale

NestJS provides modular API structure; Drizzle and `postgres` provide typed SQL access; Argon2id protects password hashes; Zod validates runtime boundaries; Fastify security plugins provide cookies, headers, CORS, and throttling; Tailwind and Lucide provide the UI system; Vitest, Playwright, and Testcontainers cover unit, browser, and infrastructure tests; ESLint, Prettier, TypeScript, pnpm, and Turborepo enforce repeatable quality gates.

## Production Gate

The foundation is not production-approved until C-002 is resolved, MFA and email delivery are integrated, secrets are placed in a managed secret store, database roles are least-privileged, RLS tests run against PostgreSQL, recovery is demonstrated, and a security review is complete.
