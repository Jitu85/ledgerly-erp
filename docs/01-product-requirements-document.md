# Product Requirements Document

## 1. Document Purpose

This document defines the business requirements for a multi-tenant, web-based ERP platform. It describes what the product must do, who will use it, and the outcomes it must support. Technical implementation choices are documented separately in `06-system-architecture.md`.

## 2. Product Vision

The platform will give small and medium-sized businesses one secure system for managing:

- Companies, subscriptions, users, roles, and permissions
- Products, variants, packaging units, barcodes, batches, expiry dates, and serial numbers
- Purchases, suppliers, supplier returns, and purchase payments
- Sales, customers, customer returns, and receipts
- Warehouses, stock transfers, stock counts, adjustments, and production movements
- Overhead expenses and approval workflows
- Accounting, journals, ledgers, receivables, payables, and financial statements
- Employees, attendance, leave, payroll, and payslips
- Operational, inventory, financial, payroll, and audit reports
- Platform administration, support, security, subscriptions, and access monitoring

Each company is a tenant. A company must only access its own data, except where a platform Super Admin performs an explicitly authorized support or security action.

## 3. Product Goals

1. Provide a reliable source of truth for stock, money owed, money paid, employee records, and business performance.
2. Support real-world packaging without confusing a product variant with a packaging level.
3. Preserve a complete history of stock and financial changes.
4. Let a company assign duties safely through roles, permissions, warehouse scope, and approval limits.
5. Support growth from one company and one warehouse to multiple companies, branches, and warehouses.
6. Make common daily tasks fast on desktop, tablet, and practical warehouse devices.
7. Make reports traceable to the source transactions that created them.

## 4. Product Principles

- **Tenant isolation:** Every company record and operation is scoped to one tenant.
- **Immutable ledgers:** Posted stock and accounting entries are never edited or deleted. Corrections use reversal and replacement entries.
- **Traceability:** Important values can be traced from reports to documents, line items, movements, approvals, and users.
- **Least privilege:** Users receive only the permissions and data scope needed for their work.
- **Explicit workflow states:** Draft, submitted, approved, posted, completed, cancelled, and reversed states have defined meanings.
- **Controlled master data:** Units, products, accounts, tax settings, warehouses, and payroll rules are governed and auditable.
- **Usable defaults, configurable policy:** The system provides sensible workflows while allowing company-level configuration.

## 5. Users and Stakeholders

| User or stakeholder | Primary need | Typical use |
|---|---|---|
| Super Admin | Operate and secure the platform | Company onboarding, subscriptions, access review, support |
| Company Owner | See company performance and control risk | Dashboards, approvals, financial and audit reports |
| Company Admin | Configure and administer one company | Users, permissions, warehouses, products, workflows |
| Accountant | Maintain accurate books | Journals, payments, reconciliation, tax and statements |
| Purchase Manager | Replenish goods at controlled cost | Requisitions, purchase orders, receipts, supplier returns |
| Sales Manager | Sell and collect revenue | Quotations, orders, invoices, returns, customer balances |
| Warehouse Staff | Handle physical stock | Receiving, picking, transfers, counts, batches and serials |
| HR/Payroll Officer | Manage workforce records and pay | Employees, attendance, leave, payroll, payslips |
| Employee | Use self-service functions | Attendance, leave, payslips, personal profile |
| Read-only Auditor | Review records without changing them | Documents, ledgers, reports, approvals, audit history |

Detailed permissions are defined in `02-user-roles-and-permissions.md`.

## 6. Functional Modules

### 6.1 Company and Subscription Management

**What it does:** Registers companies, stores legal and operating details, selects a subscription, controls account status, and tracks usage limits.

**Who uses it:** Super Admin, Company Owner, Company Admin.

**When it is used:** During onboarding, plan changes, renewals, suspension, reactivation, and account closure.

### 6.2 Identity, Users, Roles, and Approvals

**What it does:** Invites users, assigns roles and data scope, enforces permissions, and routes transactions for approval.

**Who uses it:** Super Admin for platform roles; Company Owner and Company Admin for company roles.

**When it is used:** At onboarding, when duties change, when a user joins or leaves, and whenever a controlled transaction needs approval.

### 6.3 Product and Inventory Master Data

**What it does:** Defines products, product variants, base stock units, packaging units, conversion rules, prices, barcodes, tax classes, tracking methods, and reorder settings.

**Who uses it:** Company Admin, Purchase Manager, Sales Manager, authorized Warehouse Staff.

**When it is used:** Before purchasing or selling an item and whenever product or packaging policy changes.

### 6.4 Purchasing and Suppliers

**What it does:** Manages suppliers, purchase requisitions, requests for quotation, purchase orders, goods receipts, supplier bills, returns, debit notes, and payments.

**Who uses it:** Purchase Manager, Warehouse Staff, Accountant, approvers.

**When it is used:** From demand identification through receipt, invoice matching, supplier return, and settlement.

### 6.5 Sales and Customers

**What it does:** Manages customers, quotations, sales orders, allocation, delivery, invoices, receipts, credit limits, returns, and credit notes.

**Who uses it:** Sales Manager, Warehouse Staff, Accountant, approvers.

**When it is used:** From a customer request through fulfillment, collection, return, and refund or credit.

### 6.6 Warehouses and Stock Operations

**What it does:** Manages warehouses and locations, stock availability, transfers, counts, adjustments, reservations, picking, batches, expiry dates, and serial numbers.

**Who uses it:** Company Admin, Warehouse Staff, Purchase Manager, Sales Manager, Auditor.

**When it is used:** During receiving, storage, fulfillment, internal movement, counting, correction, and investigation.

### 6.7 Expenses

**What it does:** Records overhead and operating expenses, receipts, categories, taxes, cost centres, projects, reimbursements, recurring expenses, approvals, and payment status.

**Who uses it:** Employees, managers, Accountant, Company Owner.

**When it is used:** When a cost is incurred, claimed, approved, paid, reimbursed, or reported.

### 6.8 Accounting and Finance

**What it does:** Maintains the chart of accounts, journal entries, subledgers, receivables, payables, cash and bank accounts, reconciliation, period controls, tax records, and financial statements.

**Who uses it:** Accountant, Company Owner, Read-only Auditor.

**When it is used:** Automatically when operational documents post and manually for authorized accounting adjustments and period-end work.

### 6.9 Employees, Attendance, and Leave

**What it does:** Maintains employee records, departments, positions, shifts, calendars, attendance events, timesheets, leave types, balances, requests, approvals, and holidays.

**Who uses it:** HR/Payroll Officer, managers, employees.

**When it is used:** During employee onboarding, daily attendance, schedule changes, leave requests, and payroll preparation.

### 6.10 Payroll

**What it does:** Defines earnings, deductions, benefits, taxes, loans, payroll periods, calculations, approvals, payment files, payslips, and payroll journals.

**Who uses it:** HR/Payroll Officer, Accountant, Company Owner, employees for self-service.

**When it is used:** During payroll setup, every pay period, off-cycle payments, corrections, and reporting.

### 6.11 Reporting and Analytics

**What it does:** Provides operational dashboards and reports for sales, purchases, stock, valuation, expiry, finance, expenses, attendance, leave, payroll, subscriptions, and audit activity.

**Who uses it:** All roles according to permission and scope.

**When it is used:** During daily operations, planning, reconciliation, compliance, management review, and audits.

### 6.12 Super Admin and Support

**What it does:** Manages registered companies, platform users, plans, subscriptions, account status, access logs, incidents, support cases, security policy, and platform health.

**Who uses it:** Authorized platform Super Admin and support personnel with restricted support roles.

**When it is used:** During onboarding, billing support, incident handling, risk review, account recovery, and controlled troubleshooting.

## 7. Core Business Requirements

### 7.1 Multi-Tenancy

- Every tenant-owned record must include a company identifier.
- A user may belong to more than one company, but must select an active company context.
- Permissions, numbering sequences, currencies, taxes, warehouses, workflows, and settings belong to a company.
- Cross-company reporting is unavailable to ordinary company users.
- Super Admin access to company data must be purpose-bound, time-limited where practical, and audited.
- Company suspension must block business transactions without destroying company data.
- Company export and deletion must follow retention and legal requirements.

### 7.2 Inventory and Packaging

- Each stock-tracked variant has one base stock unit.
- Packaging units represent purchasable, sellable, or scannable presentations of a variant.
- A package has a conversion quantity to the base unit, its own barcode, purchase price, selling price, and transaction permissions.
- Units include Piece, Pack, Box, Carton, Kg, Gram, Litre, Millilitre, Metre, and company-defined units.
- Product variants represent distinct stock identities such as size, colour, flavour, or model. Packaging units do not create a new stock identity.
- Stock balances are derived from an immutable stock movement ledger.
- Purchases, sales, returns, adjustments, transfers, production, opening stock, and reversals create stock movements.
- Batch, expiry, and serial tracking can be enabled per variant.
- Negative stock policy is configurable and defaults to blocked.
- Posted inventory documents cannot be edited; they are reversed and replaced.

### 7.3 Purchasing

- Support requisition, approval, purchase order, partial receipt, over/under receipt tolerance, supplier bill, three-way matching, return, debit note, and payment.
- A purchase line records the selected package and quantity plus its normalized base-unit quantity.
- Received tracked goods require batch, expiry, or serial details according to product policy.
- Supplier price history and lead time must be reportable.

### 7.4 Sales

- Support quotation, sales order, approval, reservation, pick, delivery, invoice, receipt, return, credit note, and refund.
- A sales line records the sold package and quantity plus its normalized base-unit quantity.
- Availability considers on-hand, reserved, incoming, and company negative-stock policy.
- Batch selection should support FEFO for expiring goods and FIFO where appropriate.
- Serial-tracked goods require exact serial assignment.
- Credit limits, price overrides, discounts, and below-cost sales can require approval.

### 7.5 Warehouses

- A company can have multiple warehouses and optional bins or locations.
- Users can be restricted to selected warehouses.
- Transfers use an in-transit model when the origin and destination confirm separately.
- Stock counts can freeze, snapshot, or continue operations according to company policy.
- Count differences require reason codes and may require approval.

### 7.6 Accounting

- Operational posting rules generate balanced journal entries.
- The accounting ledger is immutable after posting.
- Receivables and payables must reconcile to their control accounts.
- Periods can be open, soft-closed, or locked.
- Corrections use reversing entries and replacement transactions.
- Reports include trial balance, general ledger, profit and loss, balance sheet, cash flow, aged receivables, aged payables, and tax summaries.

### 7.7 Employees, Attendance, Leave, and Payroll

- Employee records are private and available only to authorized roles.
- Attendance supports manual entry, clock events, shift rules, lateness, absence, overtime, and corrections.
- Leave supports types, accruals or fixed grants, balances, requests, approvals, and payroll effects.
- Payroll calculations must be versioned by period and preserve the inputs used.
- Approved payroll generates payslips and balanced accounting entries.
- Payroll corrections must not silently rewrite a completed payroll.

### 7.8 Reporting

- Reports respect tenant, role, warehouse, branch, department, and sensitive-data scope.
- Report totals can be traced to source records.
- Reports show the date/time, company, filters, currency, and data status.
- Large exports run in the background and are made available securely for a limited time.

## 8. Cross-Cutting Requirements

### 8.1 Search, Numbering, and Documents

- Company-specific document numbering is supported by document type and financial year.
- Users can search by document number, name, barcode, SKU, serial, batch, phone, and reference where relevant.
- Documents may have notes and attachments subject to permissions and file policy.
- Printable and PDF forms use company branding and configurable templates.

### 8.2 Notifications

- In-app notifications are required for approvals, rejections, low stock, expiry, failed jobs, leave, and payroll availability.
- Email and messaging channels are optional integrations.
- Notification preferences must not suppress mandatory security notices.

### 8.3 Localization

- Store timestamps in UTC and display them in the company or user time zone.
- Support company currency and transaction currency with stored exchange rates.
- Number, date, language, tax, and payroll localization requirements vary by country.

### 8.4 Accessibility and Devices

- The web interface should target WCAG 2.2 AA.
- Core operations must work with keyboard navigation.
- Warehouse screens should support barcode scanners that behave as keyboard input.
- Responsive layouts must support desktop and practical tablet use. A dedicated mobile app is not an MVP requirement.

## 9. Non-Functional Business Expectations

- Common interactive screens should normally respond within two seconds under expected load.
- Posting must be atomic: either all required stock and accounting records are created, or none are.
- Long-running reports, imports, exports, and payroll runs execute as background jobs.
- The system should provide daily backups and a tested restore process.
- Availability, recovery time, recovery point, and data residency targets must be agreed before production.
- The platform must log security events and all material business changes.
- Imports must validate data and provide a rejection report before final posting.

## 10. Out of Scope for the MVP

- Full manufacturing resource planning and advanced bills of materials
- Demand forecasting and automated replenishment optimization
- Native iOS and Android applications
- Advanced point-of-sale with offline operation
- Cross-company consolidation and elimination accounting
- Country-specific statutory payroll for many countries at launch
- Electronic data interchange and deep logistics carrier integrations
- Customer and supplier portals

These items may appear in Version 2 or enterprise phases.

## 11. Success Measures

- Companies can complete purchase-to-pay and order-to-cash without external spreadsheets.
- Stock on hand reconciles to the movement ledger for every variant, warehouse, and tracking dimension.
- Posted operational documents reconcile to accounting journals.
- Permission tests show no cross-tenant access.
- Authorized users can trace report values to source transactions.
- Payroll totals reconcile to employee payslips, payment instructions, and payroll journals.
- Routine stock receiving, picking, attendance, and expense entry can be completed with minimal training.

## Open Business Decisions

1. Which countries, tax systems, currencies, and statutory payroll rules are required for the first release?
2. Can one company contain multiple legal entities or only branches of one legal entity?
3. Can one user belong to multiple companies, and can owners view a portfolio dashboard?
4. Which subscription plans, usage limits, trial rules, grace periods, and billing provider are required?
5. Is negative stock always prohibited, or can selected roles and warehouses override it?
6. Which inventory valuation methods are required at launch: weighted average, FIFO, specific identification, or more than one?
7. Does the business need landed cost allocation in the MVP?
8. Are partial package quantities allowed, such as 0.5 carton, or must packages be whole while base units may be fractional?
9. May packaging conversions change after transactions exist, and how should effective dating work?
10. Which products require batch, expiry, serial, quality-control, or recall workflows?
11. Must purchase orders and sales orders support multiple currencies and exchange-rate gains or losses in the MVP?
12. When should ownership and accounting recognition occur: receipt/delivery, supplier/customer invoice, or configurable by transaction type?
13. Which approval dimensions are required: amount, discount, margin, warehouse, expense type, department, or document type?
14. Are stock reservations hard allocations, soft allocations, or selectable by company?
15. Is an in-transit warehouse mandatory for transfers, and who confirms receipt?
16. Should stock counts freeze movements, use a snapshot, or allow both policies?
17. Which attendance sources are required: web clock, mobile location, biometric device, imported file, or manual entry?
18. What are the leave accrual, carry-forward, encashment, and negative-balance rules?
19. Which earnings, deductions, taxes, benefits, loans, and payment-file formats are required?
20. What data retention, data residency, backup, availability, RTO, and RPO commitments will be sold?
21. What support access may platform staff receive, and is company approval required for each support session?
22. Which integrations are essential for launch: payment gateway, bank feeds, e-invoicing, email, messaging, POS, or e-commerce?
