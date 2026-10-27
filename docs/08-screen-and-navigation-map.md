# Screen and Navigation Map

## 1. Purpose

This document maps the main screens and navigation for the ERP. Navigation is permission-aware: users see only modules and actions they are allowed to use. Direct URLs remain protected by server-side authorization.

## 2. Application Shell

The authenticated company workspace contains:

- Company switcher for users who belong to more than one company
- Global search for permitted documents, contacts, products, barcodes, batches, and serials
- Primary module navigation
- Quick-create menu
- Approval and task inbox
- Notifications
- Help and support
- User profile, security, and sign-out
- Active branch and warehouse context where relevant

The header must clearly show the active company. A support session must show an unmistakable banner, support identity, reason, and expiry.

## 3. Recommended Primary Navigation

1. Home
2. Tasks and Approvals
3. Inventory
4. Purchases
5. Sales
6. Expenses
7. Accounting
8. People
9. Reports
10. Administration

Employees with self-service access receive a simplified navigation: Home, Attendance, Leave, Expenses, Payslips, and Profile.

Super Admin uses a separate platform console and does not enter company data through the ordinary company navigation.

## 4. Shared Screen Patterns

### Lists

Lists support saved filters, search, sorting, status tabs, date and scope filters, column selection, pagination, export permission, and bulk actions. Sensitive columns such as cost, margin, salary, and bank data are separately protected.

### Record Details

A record page normally contains:

- Document number, state, company, branch, dates, and owner
- Summary and line items
- Approval history
- Linked documents
- Stock and accounting effects after posting
- Notes and attachments
- Audit history
- Contextual actions valid for the current state

### Transaction Entry

Entry screens support draft saving, package and barcode entry, clear totals, validation near the field, keyboard operation, and a posting preview for high-impact actions.

### Ledger Views

Stock and accounting ledgers are read-only. Users can filter and trace records but cannot edit entries.

## 5. Home and Tasks

| Screen | What it does | Primary users | When used |
|---|---|---|---|
| Role-based dashboard | Shows relevant KPIs, exceptions, and recent activity | All company roles | Start of day and management review |
| My tasks | Lists approvals, corrections, picks, receipts, and assigned work | Managers and operational users | Throughout the day |
| Approval detail | Shows document, risk signals, history, and decision controls | Authorized approvers | Before approve/reject/return |
| Notifications | Shows business and security notifications | All users | As events occur |
| Global search results | Finds permitted records across modules | All users | When locating a document or item |

## 6. Inventory Navigation

**Inventory**

- Overview
- Products
  - Product list
  - Product details
  - Variant details
  - Packaging and conversions
  - Barcodes and labels
  - Price lists
  - Categories and brands
  - Units of measure
- Stock
  - Stock on hand
  - Availability and reservations
  - Stock movement ledger
  - Batch and expiry
  - Serial numbers
- Warehouses
  - Warehouse list and details
  - Locations/bins
  - Receiving workbench
  - Pick/pack/dispatch workbench
- Transfers
  - Transfer list
  - New transfer
  - Dispatch
  - Receive
  - Differences
- Counts and adjustments
  - Count plans
  - Count entry/scanning
  - Variance review
  - Adjustment request
  - Adjustment approval
- Assembly/production, when enabled

| Screen | What it does | Primary users | When used |
|---|---|---|---|
| Product details | Maintains shared product information and variants | Company Admin, managers | Product setup and review |
| Variant details | Maintains SKU, base unit, tracking, costing, reorder policy | Company Admin | Before transactions or controlled changes |
| Packaging editor | Defines direct base conversion, barcode, flags, and prices | Company Admin, authorized managers | Product setup or effective-dated change |
| Barcode scan panel | Identifies variant/package or serial | Warehouse and sales users | Receiving, counting, picking, selling |
| Stock on hand | Shows quantity by warehouse/location/status/tracking | Operational users, Accountant | Availability check and reconciliation |
| Movement ledger | Shows immutable movement history and sources | Managers, Accountant, Auditor | Trace and investigation |
| Batch/expiry | Shows batch status and expiry risk | Warehouse Staff, managers | Picking, quarantine, recall, disposal |
| Serial history | Shows a serial's complete movement trail | Warehouse Staff, service, Auditor | Verification and traceability |

## 7. Purchase Navigation

**Purchases**

- Overview
- Suppliers
- Requisitions
- Requests for quotation
- Purchase orders
- Goods receipts
- Supplier bills
- Supplier returns and debit notes
- Purchase payments, if permitted
- Matching exceptions
- Purchase reports

| Screen | What it does | Primary users | When used |
|---|---|---|---|
| Supplier details | Stores supplier contacts, terms, tax, balance, and history | Purchase Manager, Accountant | Setup and supplier review |
| Requisition entry | Requests goods or services | Authorized requester | When a need is identified |
| Purchase order entry | Records supplier agreement by package and price | Purchase Manager | Before ordering |
| Receiving workbench | Records accepted/rejected packages, batch, expiry, and serials | Warehouse Staff | On physical arrival |
| Three-way match | Compares order, receipt, and bill | Accountant, Purchase Manager | Before bill posting |
| Supplier return | Authorizes and dispatches returned goods | Purchase and warehouse users | Damaged, excess, or incorrect receipt |

## 8. Sales Navigation

**Sales**

- Overview
- Customers
- Quotations
- Sales orders
- Reservations and allocations
- Pick lists
- Deliveries
- Sales invoices
- Receipts
- Customer returns and credit notes
- Refunds, if permitted
- Price lists and promotions
- Sales reports

| Screen | What it does | Primary users | When used |
|---|---|---|---|
| Customer details | Stores contacts, terms, credit, balances, and history | Sales Manager, Accountant | Setup and customer review |
| Quotation/order entry | Prices package quantities and checks availability | Sales users | During offer and order capture |
| Allocation screen | Reserves stock and resolves shortages | Sales Manager, Warehouse Staff | Before picking |
| Pick/pack screen | Guides package, batch, serial, and quantity confirmation | Warehouse Staff | During fulfillment |
| Delivery screen | Confirms dispatch and posts stock issue | Warehouse Staff | When goods leave custody |
| Invoice/receipt screen | Posts receivable and records collection | Sales finance, Accountant | Billing and collection |
| Customer return inspection | Records condition, tracking, disposition, and credit | Sales and warehouse users | When goods return |

## 9. Expense Navigation

**Expenses**

- My expenses
- New expense/claim
- Team approvals
- All expenses
- Recurring expenses
- Reimbursements
- Expense categories and policies
- Expense reports

The entry screen supports receipt upload, category, tax, cost centre, project, currency, and payment method. Employees see their own claims; finance users see only their authorized scope.

## 10. Accounting Navigation

**Accounting**

- Overview
- Chart of accounts
- Journal entries
- General ledger
- Receivables
  - Customer invoices
  - Receipts and allocations
  - Aged receivables
- Payables
  - Supplier bills
  - Payments and allocations
  - Aged payables
- Cash and bank
  - Accounts
  - Transactions
  - Reconciliation
- Taxes
- Fixed assets, when enabled
- Currencies and exchange rates
- Financial periods and close checklist
- Financial statements
- Posting exceptions

| Screen | What it does | Primary users | When used |
|---|---|---|---|
| Journal entry | Creates balanced authorized adjustments | Accountant | Accruals, corrections, period close |
| General ledger | Shows immutable account postings and sources | Accountant, Owner, Auditor | Reconciliation and audit |
| Bank reconciliation | Matches statements to system transactions | Accountant | Daily, weekly, or month-end |
| Period close | Tracks checks and locks posting periods | Accountant, Owner | Month/year end |
| Financial statements | Shows P&L, balance sheet, and cash flow | Accountant, Owner, Auditor | Management and statutory review |

## 11. People Navigation

**People**

- Employee directory
- Employee records
- Departments and positions
- Shifts and calendars
- Attendance
  - Clock/timesheet
  - Attendance events
  - Exceptions and corrections
  - Period close
- Leave
  - My leave
  - Team requests
  - Leave balances
  - Types and policies
- Payroll
  - Payroll settings
  - Compensation
  - Payroll periods
  - Calculation runs
  - Review and approval
  - Payslips
  - Payment files
  - Payroll journals
- HR/payroll reports

Salary, personal identity, bank, medical, and disciplinary fields must not appear in ordinary directory or search results.

## 12. Reports Navigation

**Reports** groups reports by business purpose:

- Executive dashboard
- Sales and margin
- Purchases and suppliers
- Inventory, valuation, expiry, and movement
- Warehouses and transfers
- Expenses
- Accounting and tax
- Attendance and leave
- Payroll
- Audit and access

Each report shows filter scope, as-of time, currency, status, and a route to supporting records. Saved and scheduled reports are later-phase features unless included explicitly in MVP.

## 13. Company Administration Navigation

**Administration**

- Company profile and branding
- Branches
- Users
- Roles and permissions
- Data scopes
- Approval workflows
- Warehouses and locations
- Units, taxes, currencies, and sequences
- Accounting settings and posting rules
- Inventory and negative-stock policy
- Sales and purchase settings
- Expense policies
- Attendance, leave, and payroll settings
- Notifications and templates
- Imports and exports
- Integrations and API credentials
- Subscription and usage
- Audit log
- Security and active sessions

Configuration pages must show effective dates and change history where a change can affect transactions.

## 14. Employee Self-Service

- Home: attendance status, leave balance, pending tasks, recent payslip
- Clock or timesheet
- Attendance history and correction request
- Leave calendar, request, balance, and history
- Expense claims
- Payslips
- Profile and allowed personal updates
- Security settings

Managers receive an additional ?My Team? view for assigned employees, without automatic salary access.

## 15. Super Admin Console

The platform console is visually and operationally separate:

- Platform overview and health
- Companies
  - Registration and verification
  - Subscription and usage
  - Account status
  - Security risk and access history
  - Data export/deletion status
- Platform users and administrators
- Plans, entitlements, trials, and billing events
- Support cases and authorized support sessions
- Security events, access logs, and incident management
- Background jobs and integration health
- Feature flags and controlled rollouts
- Global configuration and communication
- Platform audit reports

Company business records are not generally browsable. Access requires a support or security workflow and is clearly audited.

## 16. Responsive and Warehouse Experience

- Desktop is the primary administration and accounting experience.
- Tablet layouts support receiving, picking, counting, approval, and manager review.
- Scanner workflows keep focus in the scan field, give sound/visual confirmation, and allow rapid repeated scans.
- High-risk actions use clear confirmation with the document effect, not generic ?Are you sure?? text.
- Offline operation is not assumed for MVP.

## 17. Navigation by Role

| Role | Default landing area |
|---|---|
| Company Owner | Executive dashboard and approvals |
| Company Admin | Company dashboard and administration tasks |
| Accountant | Finance dashboard and posting exceptions |
| Purchase Manager | Purchase dashboard and pending orders/receipts |
| Sales Manager | Sales dashboard and orders/credit exceptions |
| Warehouse Staff | Warehouse task queue |
| HR/Payroll Officer | People dashboard and current pay period |
| Employee | Self-service home |
| Read-only Auditor | Audit/report index |
| Super Admin | Platform console |

## Open Business Decisions

1. Is a branch selector separate from the warehouse selector?
2. Which dashboard KPIs are required for each role in MVP?
3. Is a dedicated point-of-sale screen required?
4. Which warehouse tasks must work on phone-sized screens or offline?
5. Which barcode label formats and printers are required?
6. Are customer and supplier portals required in Version 2?
7. Can users personalize navigation and dashboards?
8. Which reports need scheduling and automatic delivery?
9. Which printable forms require company-defined templates?
10. Is global search allowed to include masked payroll or personal records for privileged users?
