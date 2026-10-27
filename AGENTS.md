# Codex Project Instructions

These instructions apply to every task in this repository.

## Read before editing

- Read this file, the relevant files in `docs/`, and the code surrounding any planned edit before making changes.
- Treat `docs/01-product-requirements-document.md` through `docs/12-implementation-stack-lock.md` as the product and architecture baseline.
- If documents conflict, do not silently choose. Record the conflict and its impact in `docs/11-open-decisions-and-conflicts.md`.
- Preserve important existing documentation when updating or reorganizing it. Do not delete or overwrite it without carrying its meaning forward.
- Record new business assumptions and unresolved policy choices under �Open Business Decisions� in `docs/11-open-decisions-and-conflicts.md`.

## Security and tenancy

- Never bypass tenant/company data isolation. Normal company operations require a verified active company context and company-scoped queries.
- Never accept a `company_id` from request data as proof that the caller may access that company.
- Keep PostgreSQL row-level security enabled as defense in depth and test cross-tenant reads and writes.
- Never store plain-text passwords, reset tokens, session tokens, signing keys, API keys, or other secrets.
- Use role-based access control and enforce it on the server. UI visibility is not authorization.
- Use least privilege, secure cookies, CSRF controls where applicable, request validation, rate limits, and auditable privileged actions.
- Do not leak whether another tenant's resource exists. Cross-tenant lookups should return the same safe not-found response as an absent resource.

## Business integrity

- Never directly alter stock balances. Stock changes must append immutable stock-ledger entries, and projections must remain rebuildable.
- Never directly alter financial balances. Financial changes must post balanced journal entries.
- Posted stock, accounting, payroll, approval, and audit history is append-only. Correct it with linked reversals or replacement records.
- Keep business rules and application services separate from UI components and transport/controller code.
- Keep cross-module writes behind explicit application commands or posting orchestration.

## Engineering quality

- Use TypeScript in strict mode. Do not weaken compiler options to make an error disappear.
- Explain every new dependency in the pull request/task summary or the relevant implementation document.
- Write tests for important business logic, authorization, tenant isolation, state transitions, security controls, and regressions.
- Prefer small, explicit modules and typed boundaries over generic CRUD abstractions for ledgers or sensitive configuration.
- Keep cache entries, jobs, files, logs, events, and exports tenant-scoped. Redis is never authoritative for stock, finance, payroll, or permissions.
- Use fixed-precision decimal database types for money and quantity; never binary floating point.
- Store timestamps in UTC and distinguish event timestamps from business dates.

## Completion gate

Before declaring a task complete:

1. Run formatting or formatting checks.
2. Run linting.
3. Run strict TypeScript checks.
4. Run relevant unit and integration tests.
5. Run migration and cross-tenant checks when the task affects persistence or authorization.
6. Report exactly what was and was not verified. Never claim an unrun command succeeded.
