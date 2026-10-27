# API Module Plan

## 1. Purpose

This document defines the planned API boundaries and representative endpoint families. It is not a final API contract. OpenAPI schemas, exact fields, status codes, and authorization tests will be designed with each development slice.

## 2. API Principles

- Version externally consumed routes under `/api/v1`.
- Use resource-oriented queries and explicit business commands.
- Do not expose generic create/update/delete operations for posted ledgers.
- Derive active company from an authorized membership context, not an untrusted body field.
- Apply tenant, permission, data scope, state, approval, and segregation checks on every request.
- Require idempotency keys for posting and externally retried commands.
- Require optimistic concurrency versions for draft edits and configuration changes.
- Return stable machine-readable error codes and human-readable messages.
- Generate and publish OpenAPI documentation from reviewed contracts.
- Audit sensitive reads, exports, and all material writes.

## 3. Common Contract Conventions

### Request Context

Each request has:

- Authenticated user or API client
- Active company membership
- Correlation/request ID
- Locale, time zone, and client metadata
- Optional idempotency key
- Support-session context when applicable

### Response Envelope

Ordinary resource responses may be direct JSON objects. Lists include `items` and pagination metadata. Errors use a consistent structure containing:

- `code`
- `message`
- `fieldErrors` when applicable
- `correlationId`
- `details` safe for the caller

Internal stack traces, SQL, secrets, and cross-tenant identifiers are never returned.

### Pagination and Filtering

- Cursor pagination for ledgers, audit events, and other large changing sets.
- Page/limit pagination may be used for bounded master-data lists.
- Filters are allow-listed and documented.
- Sort order is stable and includes a unique tiebreaker.
- Export is a separate permission and asynchronous operation for large results.

### Business Commands

Commands such as submit, approve, post, reverse, dispatch, receive, finalize, close, and reopen use explicit action endpoints. They validate state transitions and return the updated resource plus links to created effects.

## 4. Identity and Session API

Representative routes:

- `GET /me`
- `GET /me/companies`
- `POST /session/company-context`
- `GET /me/permissions`
- `GET /me/sessions`
- `DELETE /me/sessions/{sessionId}`
- `POST /invitations/{token}/accept`
- `POST /auth/step-up`

The identity provider handles credential and MFA protocols. The ERP API handles memberships, active tenant, data scope, and business authorization.

## 5. Company and Administration API

- `/companies/current`
- `/companies/current/settings`
- `/branches`
- `/document-sequences`
- `/tax-codes`
- `/currencies` and `/exchange-rates`
- `/reason-codes`
- `/users` and `/invitations`
- `/roles`, `/permissions`, and `/scope-assignments`
- `/approval-policies` and `/delegations`
- `/subscription` and `/usage`
- `/audit-events`
- `/imports`, `/exports`, and `/attachments`

Sensitive settings updates use step-up authentication and, where configured, approval.

## 6. Product and Packaging API

### Queries and Maintenance

- `/products`
- `/products/{productId}`
- `/products/{productId}/variants`
- `/variants/{variantId}`
- `/variants/{variantId}/packages`
- `/packages/{packageId}/barcodes`
- `/units-of-measure`
- `/categories` and `/brands`
- `/price-lists` and `/price-list-entries`
- `/supplier-item-prices`
- `/reorder-policies`

### Specialized Queries

- `GET /catalog/lookup?sku=...`
- `GET /catalog/barcodes/{barcode}`
- `GET /variants/{variantId}/transaction-options`
- `POST /quantity-conversions/preview`

A conversion preview returns package quantity, snapshotted factor, base quantity, precision result, and warnings. Posting never trusts a client-calculated base quantity without server validation.

## 7. Inventory and Warehouse API

### Stock Queries

- `/stock/on-hand`
- `/stock/availability`
- `/stock/movements`
- `/stock/reservations`
- `/batches` and `/batches/{id}/trace`
- `/serials` and `/serials/{id}/history`
- `/expiry`

### Warehouse Operations

- `/warehouses`
- `/warehouses/{id}/locations`
- `/stock-transfers`
- `POST /stock-transfers/{id}/submit`
- `POST /stock-transfers/{id}/approve`
- `POST /stock-transfers/{id}/dispatch`
- `POST /stock-transfers/{id}/receive`
- `/stock-counts`
- `POST /stock-counts/{id}/snapshot`
- `POST /stock-counts/{id}/submit-count`
- `POST /stock-counts/{id}/approve-variance`
- `POST /stock-counts/{id}/post`
- `/stock-adjustments`
- `POST /stock-adjustments/{id}/post`
- `/assembly-orders` and explicit issue/complete/reverse actions when enabled

Stock movement APIs are query-only. Movements are created only by authorized posting commands.

## 8. Purchasing API

- `/suppliers`
- `/purchase-requisitions`
- `/supplier-quote-requests`
- `/supplier-quotes`
- `/purchase-orders`
- `POST /purchase-orders/{id}/submit`
- `POST /purchase-orders/{id}/approve`
- `POST /purchase-orders/{id}/close-remainder`
- `/goods-receipts`
- `POST /goods-receipts/{id}/post`
- `/purchase-matches`
- `/supplier-bills`
- `POST /supplier-bills/{id}/post`
- `/supplier-returns`
- `POST /supplier-returns/{id}/dispatch`
- `/supplier-debit-notes`
- `/supplier-payments`
- `POST /supplier-payments/{id}/approve`
- `POST /supplier-payments/{id}/post`

Receipt commands include tracking allocations by accepted base quantity and validate order tolerance, warehouse scope, batch, expiry, and serial rules.

## 9. Sales API

- `/customers`
- `/sales-quotations`
- `POST /sales-quotations/{id}/accept`
- `/sales-orders`
- `POST /sales-orders/{id}/submit`
- `POST /sales-orders/{id}/approve`
- `POST /sales-orders/{id}/reserve`
- `POST /sales-orders/{id}/release-reservations`
- `/pick-lists`
- `POST /pick-lists/{id}/confirm`
- `/deliveries`
- `POST /deliveries/{id}/post`
- `/sales-invoices`
- `POST /sales-invoices/{id}/post`
- `/customer-receipts`
- `POST /customer-receipts/{id}/post`
- `/customer-returns`
- `POST /customer-returns/{id}/inspect`
- `POST /customer-returns/{id}/receive`
- `/credit-notes` and `/customer-refunds`

Availability, credit, price, margin, and approval checks are repeated during final posting, not only during draft entry.

## 10. Expense API

- `/expense-categories` and `/expense-policies`
- `/expense-claims`
- `POST /expense-claims/{id}/submit`
- `POST /expense-claims/{id}/approve`
- `POST /expense-claims/{id}/reject`
- `POST /expense-claims/{id}/post`
- `/recurring-expenses`
- `/reimbursements`
- `/expense-receipts`

File upload uses short-lived signed URLs or a controlled upload endpoint, followed by malware scanning and attachment finalization.

## 11. Accounting API

- `/accounts`
- `/accounting-periods`
- `POST /accounting-periods/{id}/soft-close`
- `POST /accounting-periods/{id}/lock`
- `POST /accounting-periods/{id}/reopen`
- `/journal-entries`
- `POST /journal-entries/{id}/submit`
- `POST /journal-entries/{id}/post`
- `POST /journal-entries/{id}/reverse`
- `/general-ledger`
- `/receivables` and `/payables`
- `/allocations`
- `/bank-accounts`
- `/bank-statements`
- `/bank-reconciliations`
- `/tax-transactions`
- `/financial-statements`
- `/posting-exceptions`

Posted journal and ledger routes are read-only. Operational reversals normally begin in the source module so stock, subledger, tax, and general ledger effects remain coordinated.

## 12. HR, Attendance, and Leave API

### HR

- `/employees`
- `/employees/{id}/employment`
- `/employees/{id}/compensation` with restricted permission
- `/departments`, `/positions`, and `/reporting-lines`
- `/shifts`, `/calendars`, and `/shift-assignments`

### Attendance

- `/attendance/events`
- `POST /attendance/clock-in`
- `POST /attendance/clock-out`
- `/attendance/results`
- `/attendance/corrections`
- `POST /attendance/corrections/{id}/approve`
- `/attendance-periods`
- `POST /attendance-periods/{id}/close`
- `/timesheets`

### Leave

- `/leave-types`, `/leave-policies`, and `/leave-balances`
- `/leave-requests`
- `POST /leave-requests/{id}/submit`
- `POST /leave-requests/{id}/approve`
- `POST /leave-requests/{id}/cancel`
- `/leave-ledger`

Employee self-service routes resolve the employee from the authenticated membership rather than accepting an arbitrary employee ID for own-record actions.

## 13. Payroll API

- `/payroll-components`
- `/payroll-rules`
- `/payroll-periods`
- `/payroll-runs`
- `POST /payroll-runs/{id}/calculate`
- `GET /payroll-runs/{id}/versions`
- `POST /payroll-runs/{id}/select-version`
- `POST /payroll-runs/{id}/submit`
- `POST /payroll-runs/{id}/approve`
- `POST /payroll-runs/{id}/finalize`
- `POST /payroll-runs/{id}/reverse`
- `/payroll-runs/{id}/payment-batches`
- `/payroll-runs/{id}/journal`
- `/payslips/mine`
- `/payslips/{id}` with employee or restricted payroll scope

Calculation is asynchronous and returns a job reference. Each result identifies the input snapshot and rule version used.

## 14. Approvals and Tasks API

- `/tasks`
- `/approval-instances/{id}`
- `POST /approval-tasks/{id}/approve`
- `POST /approval-tasks/{id}/reject`
- `POST /approval-tasks/{id}/return`
- `POST /approval-tasks/{id}/delegate`
- `/approval-history`

Decision requests include the document version seen by the approver. If material data changed, the request fails and the user must review the new version.

## 15. Reports and Export API

- `/reports/catalog`
- `/reports/{reportCode}/preview`
- `POST /reports/{reportCode}/exports`
- `/report-exports/{id}`
- `POST /report-exports/{id}/download-link`
- `/dashboards/{dashboardCode}`

Each report declares required permission, supported filters, scope behavior, data freshness, currency rules, and drill-down target. Download links are short-lived and company-bound.

## 16. Super Admin API

Use a separate route family and authorization boundary such as `/platform/v1`:

- `/platform/v1/companies`
- `/platform/v1/companies/{id}/status-actions`
- `/platform/v1/plans` and `/subscriptions`
- `/platform/v1/platform-users`
- `/platform/v1/security-events`
- `/platform/v1/access-events`
- `/platform/v1/support-cases`
- `/platform/v1/support-sessions`
- `/platform/v1/jobs` and `/service-health`
- `/platform/v1/feature-rollouts`
- `/platform/v1/audit-events`

There is no general-purpose endpoint to read arbitrary tenant tables. Support-session APIs grant narrow, expiring access through company application services.

## 17. Imports API

1. `POST /imports` creates an import with entity type and file metadata.
2. The client uploads to a controlled location.
3. `POST /imports/{id}/validate` starts validation.
4. `GET /imports/{id}` returns progress and error counts.
5. `GET /imports/{id}/errors` provides safe row errors.
6. `POST /imports/{id}/commit` applies an approved valid import idempotently.
7. Opening stock or balances use dedicated posting workflows, not a generic table import.

Imports enforce normal tenant, validation, approval, audit, and ledger rules.

## 18. Integration and Webhook API

- `/api-clients`
- `/webhook-endpoints`
- `/webhook-deliveries`
- `POST /webhook-deliveries/{id}/retry`
- Provider-specific connection and callback routes

Webhook events may include document approved/posted/reversed, stock threshold reached, company status changed, payroll finalized, and export completed. Payloads are versioned, signed, tenant-scoped, minimal, and replay-safe.

Inbound integrations use client credentials or signed provider callbacks, narrow scopes, rate limits, idempotency, and inbox deduplication.

## 19. Event Contract Plan

Internal and external events contain:

- Event ID and version
- Event type
- Occurred and published timestamps
- Company ID or platform scope
- Actor and correlation ID where appropriate
- Source aggregate type and ID
- Minimal payload or a safe reference

Consumers must be idempotent. Sensitive payroll, personal, bank, or security fields are excluded unless a specifically authorized contract requires them.

## 20. Error Categories

- `VALIDATION_FAILED`
- `AUTHENTICATION_REQUIRED`
- `PERMISSION_DENIED`
- `TENANT_CONTEXT_INVALID`
- `RESOURCE_NOT_FOUND` without revealing cross-tenant existence
- `VERSION_CONFLICT`
- `INVALID_STATE_TRANSITION`
- `APPROVAL_REQUIRED`
- `APPROVAL_LIMIT_EXCEEDED`
- `INSUFFICIENT_STOCK`
- `TRACKING_DATA_REQUIRED`
- `PERIOD_LOCKED`
- `IDEMPOTENCY_CONFLICT`
- `RATE_LIMITED`
- `DEPENDENCY_UNAVAILABLE`

Errors that expose cost, balance, personal data, or another tenant's existence must be carefully redacted.

## 21. API Testing Requirements

- Contract tests for every route and event version.
- Permission and scope tests for each action.
- Cross-tenant identifier substitution tests.
- State-transition and approval tests.
- Idempotency and concurrent posting tests.
- Quantity conversion and decimal boundary tests.
- Batch, expiry, and serial validation tests.
- Balanced journal and period-lock tests.
- Payroll confidentiality tests.
- Rate-limit, file-upload, and webhook signature tests.

## 22. Delivery Order

1. Identity, company context, permissions, audit, shared references
2. Products, variants, packaging, warehouses, and stock queries
3. Purchase receipt posting and stock ledger
4. Sales delivery posting, reservation, and returns
5. Accounting posting and subledgers integrated into those flows
6. Transfers, counts, adjustments, batch/serial depth
7. Expenses, attendance, leave, and payroll
8. Reports, imports, integrations, and platform operations expansion

This order follows business dependency, not merely screen grouping.

## Open Business Decisions

1. Will any API be public at MVP, or only used by the first-party web application?
2. Which integrations require webhooks, batch files, or synchronous APIs?
3. Which public API rate limits and subscription entitlements are required?
4. Is GraphQL needed for any approved consumer, or is REST sufficient?
5. What maximum import and export sizes must be supported?
6. How long are idempotency keys and webhook delivery records retained?
7. Which events can include personal or financial details?
8. Do customers require customer-managed API clients and IP allow-lists?
9. Which bulk actions must be synchronous versus asynchronous?
10. What backward-compatibility period is promised for public API versions?
