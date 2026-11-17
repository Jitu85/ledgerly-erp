# Phase 2 Progress

## Final checkpoint - 28 June 2026

Phase 2 engineering foundation implementation and visual QA are complete.

### Completed

- Read all pre-existing documents in `docs/`.
- Added durable repository instructions in `AGENTS.md`.
- Recorded document conflicts and open decisions in `docs/11-open-decisions-and-conflicts.md`.
- Locked the implementation stack in `docs/12-implementation-stack-lock.md`.
- Created the pnpm/Turborepo monorepo with web, API, worker, shared UI, shared types, configuration, database, Docker, tests, and CI structure.
- Implemented the NestJS/Fastify authentication, session rotation, lockout, CSRF, rate-limit, tenant-context, authorization, audit, health-check, and company-user foundations.
- Added the minimum requested PostgreSQL schema, migration, RLS policies, immutable audit trigger, and seed setup.
- Implemented the Next.js authentication screens, protected routes, company shell, Super Admin placeholder, profile placeholder, responsive navigation, reusable states, and dark mode.
- Added local PostgreSQL/Redis Compose configuration and GitHub Actions quality checks.
- Installed dependencies and generated `pnpm-lock.yaml`.
- Inspected the prerendered protected dashboard without bypassing or weakening route authentication.
- Compared the dashboard with the generated visual direction and confirmed the intended navy shell, teal accents, compact controls, foundation checklist, empty state, and dark theme treatment.
- Verified the responsive off-canvas navigation at a phone-sized viewport.

### Verified

- `pnpm quality` passed: formatting, linting, strict TypeScript checking, and unit tests.
- `pnpm test:integration` passed, including the versioned API health endpoint.
- `pnpm build` passed for all workspace packages, including the production Next.js build.
- The live login page was inspected in the in-app browser and its theme switch was verified.
- The prerendered dashboard was inspected at 1440 × 900 and 390 × 844.
- The dashboard page identity, meaningful content, absence of framework overlays, and clean browser console were verified.
- Desktop layout had no horizontal overflow; the 264-pixel sidebar and workspace aligned correctly.
- Dark mode changed both the rendered theme and the theme control's accessible label.
- Mobile navigation opened with its scrim and closed with both the sidebar and scrim restored to their expected states.

### Remaining

The Phase 2 engineering foundation is complete. Production-readiness gates and unresolved business decisions remain documented in `docs/11-open-decisions-and-conflicts.md` and `docs/12-implementation-stack-lock.md`.

### Environment limitations observed

- Docker is not installed on this host, so PostgreSQL/Redis container startup and live migrations could not be executed here.
- The Windows sandbox blocks some child-process forks (`spawn EPERM`). Worker-thread test/build settings were used where supported.
- The dedicated patch tool could not initialize its Windows sandbox in this workspace; unified changes were applied through safe workspace-local fallbacks.

---

## Deployment Readiness Checkpoint - 27 October 2026

Repository audit, housekeeping, landing page design alignment, and build validation completed ahead of deployment.

### Completed

- **Clean Up & Housekeeping**:
  - Successfully deleted all leftover `.qa-*` files (`.qa-static-server.mjs`, `.qa-static.stderr.log`, `.qa-static.stdout.log`, and `.qa-login.png`).
  - Removed stale log files (`.web-dev.*.log`, `.web-start.*.log`).
  - Pruned empty folders (`apps/web/src/app/(workspace)/platform`).
  - Purged accidental compilation directory in `packages/config/typescript/dist`.
- **Code Fixes & Standards**:
  - Repaired `apps/api/src/sales/sales.service.ts`: resolved stray trailing text, eliminated unused `auditLogs` import, and properly typed `CustomerPriceAssignmentInput`.
  - Fixed character encoding for loading state in `apps/web/src/components/auth-form.tsx`.
  - Added responsive styling for `.platform-attribution` in `apps/web/src/app/globals.css`.
- **Home Screen Landing Page**:
  - Updated `apps/web/src/app/page.tsx` to render the Ledgerly authentication landing page directly at `/` (top bar with brand & theme switch, dark navy stage aside with copy and decorative lines, and centered auth card with secure sign-in and registration actions).
  - Production static prerendering for `/` and `/login` verified.

### Verification Status

- `pnpm format:check`: Passed — all matched files formatted with Prettier.
- `pnpm lint`: Passed — all 6 workspace packages verified.
- `pnpm typecheck`: Passed — strict TypeScript across all apps and packages.
- `pnpm test`: Passed — 9 of 9 tasks (53 unit tests in API, DB, Web, Worker).
- `pnpm test:integration`: Passed — versioned health check verified.
- `pnpm build`: Passed — all packages and production Next.js application built cleanly.

### Next Step for Next Session

- Proceed with target deployment (Docker Compose local stack or cloud host deployment as configured in `docker/compose.local.yml` and `.env`).

---

## Production Deployment & Full Accounting/Expenses Checkpoint - 17 November 2026

Successfully deployed the live production environment, wired all frontend screens to live backend REST endpoints, and implemented the complete Core Accounting and Expenses modules with double-entry ledger balancing and strict multi-tenancy.

### 1. Live Deployment Infrastructure
- **Frontend Live Host**: Deployed to Vercel at `https://ledgerly-erp.vercel.app`.
- **Backend API Live Host**: Deployed to Render Web Service at `https://ledgerly-erp.onrender.com`.
- **Database**: Provisioned serverless PostgreSQL on Neon (`ep-wild-sky-a18u03qr` in `ap-southeast-1`) with pooling.
- **Production Seed Account**: Verified `admin@ledgerly.com` / `LedgerlyAdmin2026!` for `Ledgerly Enterprises`.

### 2. Frontend Live API Integration
- Wired live REST APIs across all functional modules:
  - **Dashboard**: Live metrics (`/api/v1/sales/outstanding`, inventory stock levels, purchases).
  - **Inventory**: Live stock balances, items, warehouses, and valuation.
  - **Purchases**: Suppliers, purchase orders, goods receipt posting, and purchase invoices.
  - **Sales**: Customers, quotations, sales orders, deliveries, and sales invoices.
  - **Team/People**: Company members, invitees, and role assignments.
  - **Auth & Profile**: Session validation (`GET /api/v1/auth/me`), profile update, and active company context.

### 3. Core Accounting & General Ledger Implementation
- **PostgreSQL Schema (`database/src/accounting-schema.ts`)**:
  - `accounts`: Standard Chart of Accounts (Asset, Liability, Equity, Revenue, Expense) with parent hierarchy.
  - `accounting_periods`: Fiscal years and periods with soft-close and permanent locked status.
  - `journal_entries`: Manual and auto-generated journal entries (`DRAFT`, `POSTED`, `REVERSED`).
  - `journal_lines`: Double-entry debit/credit ledger lines with append-only integrity triggers.
- **Service & Engine (`apps/api/src/accounting/`)**:
  - Double-entry validation: strict rejection of journals where `sum(debit) != sum(credit)`.
  - Immutable journal reversal: posting symmetrical offsetting journal entries.
  - General Ledger reporting with dynamic running balances.
  - Trial Balance engine ensuring balanced debit/credit sums.
- **Frontend Screen (`apps/web/src/components/accounting/accounting-screen.tsx`)**:
  - Chart of Accounts browser & account creation form.
  - Interactive Journal Entry composer with real-time debit/credit balancing indicator.
  - One-click Post to GL and Reverse Journal actions.
  - Live General Ledger ledger viewer with account filtering.
  - Trial Balance report with balanced verification badge.
  - Fiscal Period management (Close Period, Lock Period).

### 4. Expenses & Claims Implementation
- **PostgreSQL Schema (`database/src/expense-schema.ts`)**:
  - `expense_categories`: Categorization with optional policy limit and default GL account mapping.
  - `expense_claims`: Multi-line expense claims (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `POSTED`).
  - `expense_lines`: Individual expense items with amount, receipt URL, and tax tracking.
- **Service & Engine (`apps/api/src/expenses/`)**:
  - Claim submission and approval/rejection workflows with tenant verification.
  - Automated GL posting (`postClaimToGL`): automatically creates and posts balanced double-entry journal entries crediting Accounts Payable / Reimbursements Payable and debiting categorized Expense accounts.
- **Frontend Screen (`apps/web/src/components/expenses/expense-screen.tsx`)**:
  - Claims workbench with status filtering.
  - Multi-line item expense claim submission modal with live subtotal and tax calculation.
  - Approver workbench: Approve, Reject, and Post to GL.
  - Expense Category configuration with policy limits.

### 5. Verification Status
- `pnpm format:check`: Passed — all files formatted to Prettier standards.
- `pnpm lint`: Passed — zero ESLint errors or warnings across 7 packages.
- `pnpm typecheck`: Passed — strict TypeScript compiler validation passed across all packages.
- `pnpm test`: Passed — 9 test suites, 85+ unit tests passed (60 in `@erp/api`, 21 in `@erp/database`, 3 in `@erp/web`, 1 in `@erp/worker`).
- `pnpm build`: Passed — Turborepo and Next.js production builds completed cleanly.

