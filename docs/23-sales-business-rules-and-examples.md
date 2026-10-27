# Sales Business Rules and Examples

## Customer and credit lifecycle

Customers start inactive and are company-specific. Activation follows review of tax, terms, credit and pricing. Proposed credit exposure is `outstanding + current value - approved credit notes`. A breach is blocked unless the caller has the separate credit-override authority and the reason is audited.

## Pricing

Price lists and items are effective-dated. Customer/category assignments select a price source. Every quotation, order, delivery, invoice and return snapshots package, conversion, price, discount and tax; later price changes never rewrite history. All calculations use fixed decimals.

## Quotation, order and reservation

Quotation states are Draft, Sent, Accepted, Rejected, Expired, Cancelled and Converted. They have zero stock effect. Sales orders move through draft, submission and approval and also have zero physical stock effect. Optional reservations are base-unit commitments: physical 500 minus reserved 120 gives available-to-sell 380.

Two cartons where one carton is ten boxes and one box is twelve pieces reserve `2 × 120 = 240` pieces. No inventory ledger row is created.

## Delivery, invoice and return

Dispatching one carton posts one immutable `SALES_DISPATCH` line of `-120` base pieces and reduces/releases reservation in the same transaction. Batch-tracked dispatch requires a batch; serial-tracked dispatch requires eligible unique serials. Partial dispatch leaves the remaining order quantity open.

A normal invoice does not change stock. Immediate delivery must create exactly one linked dispatch and be idempotent; the current safe API requires an approved order and routes tracked goods through delivery first.

A return cannot exceed net dispatched quantity. Accepted return stock is posted only as immutable `SALES_RETURN` and enters the selected saleable, damaged, quarantine or scrap condition. Credit notes adjust commercial exposure without independently altering stock.

## Payments and tenancy

Payment allocations cannot exceed either payment value or invoice outstanding. Every lookup uses the verified company context and a cross-tenant identifier receives the same safe not-found response as an absent record.
