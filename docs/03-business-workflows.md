# Business Workflows

## 1. Purpose

This document describes the business processes the ERP must support. It focuses on users, decisions, document states, and business effects. Database and API implementation details are documented separately.

## 2. Common Document Lifecycle

Unless a module needs a simpler flow, controlled documents use these states:

| State | Meaning | Allowed outcome |
|---|---|---|
| Draft | Work is incomplete and has no ledger effect | Edit, submit, or delete |
| Submitted | Ready for review | Approve, reject, or return to draft |
| Approved | Authorized but not necessarily posted | Post, fulfil, or cancel under policy |
| Partially completed | Some quantities or value remain open | Continue or close remainder |
| Posted/Completed | Final business and ledger effects exist | Reverse or create linked return/correction |
| Rejected | Approval was denied | Revise into a new submission or close |
| Cancelled | Stopped before final posting | No ledger effect; history remains |
| Reversed | Original posted effect was neutralized | View original and reversal; create replacement |

Posting must be atomic. Stock movements, journals, balances, document status, and audit records must either succeed together or fail together.

## 3. Company Onboarding

**Users:** Super Admin, Company Owner, Company Admin.

**When used:** When a business starts using the platform.

1. A company registers or is created by an authorized platform operator.
2. The owner verifies identity and accepts terms.
3. The company selects a plan or trial.
4. The owner enters legal name, base currency, time zone, financial year, tax profile, and initial branches.
5. The system creates protected owner and administrator access.
6. The admin configures warehouses, units, document sequences, chart of accounts, taxes, approval rules, and payroll policy.
7. Master data is entered or imported and validated.
8. Opening stock and accounting balances are reviewed and posted with dated source references.
9. The owner confirms readiness and the company becomes active.

A suspended company retains data but cannot create or post ordinary transactions. Read access and export behavior depends on suspension policy.

## 4. Purchase-to-Pay

**Users:** Requester, Purchase Manager, approver, Warehouse Staff, Accountant.

**When used:** When goods or services are acquired from a supplier.

1. A requester creates a purchase requisition with required date, warehouse, items, packages, quantities, and reason.
2. Required approvals are completed.
3. The Purchase Manager requests quotations or selects an approved supplier.
4. A purchase order records agreed packages, quantities, prices, tax, currency, delivery terms, and tolerances.
5. The order is approved and sent to the supplier.
6. Warehouse Staff receives goods against the order. Partial receipt is allowed.
7. The receiver records package quantity, normalized base quantity, accepted/rejected quantity, location, batch, expiry, and serials as required.
8. Posting the goods receipt creates positive immutable stock movements. It may create a goods-received-not-invoiced accounting entry according to policy.
9. The supplier bill is captured and matched to the order and receipt.
10. Quantity or price differences outside tolerance are routed for approval.
11. Posting the bill creates the payable, tax, inventory/expense, and clearing entries.
12. The Accountant prepares payment; a separate approver releases it if maker-checker is enabled.
13. Payment posting reduces the supplier balance and cash/bank account.
14. The order closes when quantities and financial obligations are complete or an authorized user closes the remainder.

No stock movement is created by a requisition, purchase order, or supplier bill alone unless company policy explicitly makes the bill the receiving document.

## 5. Supplier Return

**Users:** Purchase Manager, Warehouse Staff, Accountant, approver.

1. A return request references the original receipt where possible.
2. The user selects exact variant, package display quantity, base quantity, warehouse, batch, and serials.
3. Approval checks return reason, quantity, value, and supplier policy.
4. Dispatch posting creates negative stock movements from the selected warehouse.
5. A debit note or supplier credit reverses the payable, tax, and inventory or cost effects according to the original transaction.
6. Refund or supplier credit allocation is recorded separately.

A return cannot silently alter the original receipt or bill.

## 6. Order-to-Cash

**Users:** Sales Manager, approver, Warehouse Staff, Accountant or cashier.

**When used:** When goods or services are sold to a customer.

1. A quotation is prepared using a price list, selected packages, taxes, and validity period.
2. An accepted quotation becomes a sales order, or an order is entered directly.
3. The system checks customer status, credit limit, price overrides, discount, margin policy, stock availability, and required approvals.
4. Approved order lines may reserve stock in base units by warehouse, batch, or serial policy.
5. Warehouse Staff creates a pick list. FEFO is suggested for expiring stock; serials are explicitly selected.
6. Pick and pack confirmation records actual quantities and tracking details.
7. Delivery posting creates negative immutable stock movements and releases the related reservations.
8. An invoice is created from delivered or ordered quantities according to company policy.
9. Invoice posting creates receivable, revenue, tax, and cost-of-goods-sold entries. Inventory accounting timing follows the selected recognition policy.
10. Receipts are allocated to one or more invoices and posted to cash/bank and receivables.
11. The order completes when delivery and invoicing are complete or the authorized remainder is closed.

Posting must prevent overselling when negative stock is blocked. Concurrent orders must not consume the same available stock.

## 7. Customer Return and Refund

**Users:** Sales Manager, Warehouse Staff, Accountant, approver.

1. A return authorization references the original delivery or invoice where possible.
2. The reason, condition, expected quantity, refund method, and approval are recorded.
3. Warehouse Staff receives and inspects the goods.
4. Accepted goods are routed to saleable, quarantine, repair, or damaged locations.
5. Receipt posting creates positive stock movements only for quantities returned to inventory.
6. A credit note reverses revenue, tax, receivable, and cost effects as appropriate.
7. The credit is allocated to an open balance or paid as an authorized refund.
8. Rejected or scrapped returns create the correct location movement or adjustment rather than being treated as saleable stock.

## 8. Warehouse Transfer

**Users:** Warehouse Staff, Warehouse Manager or approver.

1. A transfer request identifies source, destination, items, base quantities, batches, serials, and reason.
2. Approval is obtained when required.
3. Source staff pick and dispatch stock.
4. Dispatch creates a negative movement at the source and a positive movement in an in-transit location or warehouse.
5. Destination staff inspect and receive stock.
6. Receipt creates a negative in-transit movement and a positive destination movement.
7. Differences, damage, or missing stock require reason codes and an approved adjustment or claim.

For immediate transfers within one controlled site, dispatch and receipt may post in one transaction, but both movement sides remain visible.

## 9. Stock Count and Adjustment

**Users:** Warehouse Staff, independent counter, approver, Accountant for valuation review.

1. An authorized user creates a count plan for selected locations, categories, or variants.
2. The system records a stock snapshot or freezes relevant movements according to company policy.
3. Count sheets may hide expected quantities for blind counting.
4. Counters enter base quantities or scan packages; the system normalizes package counts.
5. Material differences require recount.
6. The system calculates approved variance by variant, tracking dimension, and location.
7. Posting creates immutable positive or negative adjustment movements with reason codes.
8. Accounting entries record inventory gain or loss using the chosen valuation method.
9. The count closes with a variance and approval report.

Direct edits to stock balances are never allowed.

## 10. Batch, Expiry, Serial, and Recall

**Users:** Warehouse Staff, Purchase Manager, Sales Manager, Auditor.

- Batch-tracked receipts create or select a batch and capture manufacture/expiry dates where required.
- Serial-tracked receipts capture one unique serial per base unit.
- Picks allocate eligible batches or serials and preserve full movement history.
- Expired, recalled, or quarantined stock is blocked from sale unless an explicit controlled exception exists.
- A recall report traces received batches or serials through transfers, deliveries, returns, and current locations.
- Disposal is posted as an approved stock adjustment with an auditable reason.

## 11. Production or Assembly

**Users:** Production user, Warehouse Staff, approver, Accountant.

This is a limited workflow before full manufacturing is introduced:

1. An assembly order defines input variants, output variants, expected quantities, and warehouse locations.
2. Inputs are reserved and issued.
3. Posting consumption creates negative input stock movements.
4. Posting output creates positive finished-goods and by-product movements.
5. Scrap creates negative or separately classified movements.
6. Cost is transferred from inputs and approved overhead into outputs according to the selected costing rule.
7. Corrections use reversal and replacement movements.

A packaging conversion by itself is not production. Repacking only needs movements if the business treats packages as separately stocked identities; the recommended model stores stock in the base unit and does not create stock merely by changing presentation.

## 12. Expense-to-Payment

**Users:** Employee or requester, manager, Accountant, payment approver.

1. The requester enters supplier/payee, date, category, amount, tax, cost centre, project, payment method, and receipt.
2. The system checks policy limits, duplicate receipts, required fields, and approval routing.
3. The manager approves, rejects, or requests changes.
4. The Accountant verifies tax and account coding.
5. Posting creates an expense or asset, tax, payable, employee reimbursement, cash, or card clearing entry.
6. Payment or reimbursement is prepared, approved, and posted.
7. Recurring expenses create drafts for review; they do not post silently unless policy expressly allows it.

## 13. Accounting and Period Close

**Users:** Accountant, Company Owner, Auditor.

1. Operational modules send balanced posting instructions to accounting.
2. The Accountant reviews unmatched receipts, deliveries, bills, invoices, payments, stock valuation, payroll, and bank items.
3. Bank accounts are reconciled against statements.
4. Authorized accruals, depreciation, exchange differences, and corrections are posted.
5. Subledgers are reconciled to control accounts.
6. A trial balance and draft statements are reviewed.
7. The period is soft-closed to restrict ordinary posting.
8. Final approval locks the period.
9. Later corrections use an authorized entry in an open period, with reference to the affected period; reopening requires elevated permission and audit.

Posted journals remain immutable. A reversal links directly to the original journal.

## 14. Attendance Workflow

**Users:** Employee, manager, HR/Payroll Officer.

1. A schedule assigns shifts, workdays, holidays, and expected times.
2. Clock-in/out, imported device events, timesheets, or authorized manual entries create raw attendance events.
3. The rules engine calculates worked time, lateness, absence, breaks, and overtime.
4. Exceptions are shown to the employee or manager.
5. Corrections require a reason and approval.
6. HR closes the attendance period.
7. Approved results become payroll inputs and remain linked to their source events.

Raw device events should be preserved; corrections add approved records rather than hiding the original event.

## 15. Leave Workflow

**Users:** Employee, manager, HR/Payroll Officer.

1. Leave types define eligibility, units, accrual or grant rules, notice, documents, and payroll effect.
2. The employee requests dates or hours and provides a reason or attachment where required.
3. The system checks balance, overlap, holidays, schedule, team limits, and notice policy.
4. The manager and HR approve according to workflow.
5. Approved leave updates the leave ledger and attendance schedule.
6. Paid or unpaid leave flows into payroll.
7. Cancellation or correction creates a linked balance reversal after approval.

## 16. Payroll Workflow

**Users:** HR/Payroll Officer, payroll approver, Accountant, Company Owner, Employee.

1. HR opens a payroll period and snapshots eligible employees and active compensation rules.
2. The system imports approved attendance, overtime, leave, benefits, deductions, taxes, loans, and one-time adjustments.
3. A calculation run stores versioned inputs, rule versions, results, warnings, and errors.
4. HR reviews exceptions and reruns a new calculation version when inputs change.
5. An authorized approver reviews payroll totals and employee changes.
6. Approval locks the selected calculation version.
7. Finalization creates payslips, payment instructions, liabilities, and a balanced payroll journal.
8. The Accountant posts the journal and authorized staff release payments.
9. Employees receive secure access to their own payslips.
10. Corrections use an off-cycle run or reversal; completed payroll is not overwritten.

## 17. Approval Workflow

**Users:** Submitter, one or more approvers, delegate, administrator.

1. Submission evaluates the active workflow version.
2. The system records the resulting approval route so later configuration changes do not rewrite history.
3. Approvers receive tasks within their role, scope, and limit.
4. Approve, reject, return, delegate, and escalation actions are timestamped with comments.
5. Material edits invalidate prior approval and trigger resubmission.
6. Completion authorizes the next action but does not itself post unless the workflow explicitly combines approval and posting.

## 18. Reporting and Export

**Users:** Any authorized role.

1. The user selects a report and permitted filters.
2. The system applies tenant and data scope before aggregation.
3. On-screen results show data status, currency, time zone, and generation time.
4. Users can drill from totals to source documents and ledger entries where authorized.
5. Large reports run in the background.
6. Export files are encrypted in storage, expire automatically, and are audited when downloaded.

## 19. Reversal and Correction Rules

- Draft errors are edited normally.
- Posted documents are not edited or deleted.
- A reversal uses the original dimensions, quantities, costs, taxes, batches, serials, and accounts unless a controlled correction rule states otherwise.
- The replacement document references both the original and reversal.
- Closed-period and already-consumed stock may require a current-period financial correction rather than a historical physical reversal.
- Reversal permission and approval should be stricter than creation permission.

## Open Business Decisions

1. Which document state should trigger stock and accounting recognition in purchases and sales?
2. Are purchase requisitions and quotations required in the MVP or optional company features?
3. What receipt and invoice matching tolerances are permitted?
4. Can a user receive more than the ordered quantity, and who approves the excess?
5. When and how are sales reservations created, expired, and reallocated?
6. Is warehouse transfer receipt confirmation mandatory for every transfer?
7. Which customer returns may be accepted without an original invoice?
8. How should restocking fees, damaged returns, warranties, and exchanges be handled?
9. Are stock counts frozen, snapshot-based, or selectable?
10. Is light assembly required in MVP, and how are overhead and scrap costed?
11. Which expenses may auto-repeat or be paid immediately?
12. Which period-close controls are mandatory before locking?
13. Which attendance capture methods and overtime rules are required at launch?
14. Which payroll corrections require reversal versus an adjustment in the next period?
15. Which workflow changes are considered material and require reapproval?
