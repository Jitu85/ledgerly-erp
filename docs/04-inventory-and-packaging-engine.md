# Inventory and Packaging Engine

## 1. Purpose

This document defines the business rules and technical invariants for products, variants, units, packaging, barcodes, stock tracking, valuation, and the immutable stock ledger.

The central rule is simple: **all physical stock is measured in a variant's base stock unit, while users may buy, sell, count, and scan approved packaging units.**

## 2. Core Concepts

### 2.1 Product

A product is the commercial family shown to users, such as ?Classic Cola? or ?Safety Glove.? It contains shared information such as brand, category, description, tax class, and images.

A product is not necessarily a stock identity.

### 2.2 Product Variant

A variant is a distinct stock identity. Differences that require separate availability, cost, barcode, batch, serial, or replenishment usually create variants.

Examples:

- Classic Cola / 330 ml formula / Regular
- Classic Cola / 330 ml formula / Sugar Free
- Safety Glove / Blue / Size M
- Safety Glove / Blue / Size L

Each stock-tracked variant has its own SKU, base stock unit, tracking policy, costing policy, and stock ledger history.

### 2.3 Packaging Unit

A packaging unit is a way to transact or scan one variant. It does not create different stock.

Examples for one glove variant:

- Piece = 1 piece
- Pack = 10 pieces
- Box = 5 packs = 50 pieces
- Carton = 8 boxes = 400 pieces

If 2 cartons are purchased, the stock ledger receives `+800 pieces`. If 3 packs are sold, it records `-30 pieces`. The interface continues to display the packages used on each document.

### 2.4 Unit of Measure

A unit defines how a quantity is measured. Initial system units include:

- Count: Piece, Pack, Box, Carton
- Mass: Gram, Kilogram
- Volume: Millilitre, Litre
- Length: Metre
- Custom: company-defined units with a name, symbol, precision, and measurement dimension

Pack, Box, and Carton are normally product-specific packaging units, not universal physical conversions. One carton may contain 24 pieces for one variant and 400 pieces for another.

## 3. Variant Versus Packaging Decision

Use a **variant** when the item has a distinct stock identity. Use a **package** when the same stock is only grouped differently.

| Question | If yes |
|---|---|
| Does it have different physical characteristics such as size, colour, flavour, or model? | Usually a variant |
| Must its stock, cost, expiry, serials, or replenishment be tracked separately? | Variant |
| Can the contents be opened and sold as the same item in smaller quantities? | Usually packaging |
| Is it only a supplier/customer presentation with a conversion to the same base stock? | Packaging |
| Does the outer package itself need independent batch or serial identity? | May require a separate variant or future container model |

Example: a 500 ml bottle and a 1 litre bottle are normally variants because the physical item differs. A carton containing 12 identical 500 ml bottles is packaging for the 500 ml variant.

## 4. Base Stock Unit

Every stock-tracked variant must have exactly one base unit. All ledger quantities are stored in that unit.

Recommended base units:

- Individually countable goods: Piece
- Goods managed by mass: Gram or Kilogram, based on required precision
- Liquids managed by volume: Millilitre or Litre
- Length goods: Metre or a smaller custom unit where precision requires it

The base unit should not change after the variant has posted stock movements. A change requires a controlled migration or a replacement variant.

## 5. Packaging Definition

Each packaging record belongs to one variant and contains:

- Display name and short code
- Unit reference
- Quantity of base units per package
- Optional parent package for user-friendly hierarchy
- Purchase-enabled flag
- Sale-enabled flag
- Count-enabled flag
- Default purchase and sale flags
- Whole-package or fractional-quantity rule
- Barcode or multiple barcode aliases
- Default purchase price and currency
- Default selling price or price-list entries
- Optional dimensions and weight for logistics
- Effective start/end dates and active status

The authoritative conversion is always direct to the base unit. Parent relationships aid display and validation but are not used as a fragile chain during posting.

Example:

| Package | Parent display | Direct conversion | Purchase price | Selling price |
|---|---|---:|---:|---:|
| Piece | None | 1 piece | 1.20 | 1.80 |
| Pack | Piece | 10 pieces | 11.00 | 17.00 |
| Box | Pack | 50 pieces | 52.00 | 82.00 |
| Carton | Box | 400 pieces | 400.00 | 640.00 |

Prices are not assumed to be mathematically proportional. Commercial discounts and rounding may differ by package.

## 6. Conversion Rules

For a transaction line:

`base quantity = entered package quantity ? package conversion to base`

The line must snapshot:

- Entered package identifier and label
- Entered package quantity
- Conversion factor used
- Calculated base quantity
- Unit price in the transaction package
- Currency, exchange rate, discounts, and taxes

Historical lines must not recalculate when a package definition or price changes.

Rules:

- Conversion factors must be positive.
- Quantity and conversion use fixed-precision decimal values, never binary floating point.
- The base quantity must fit the variant's allowed precision.
- Serial-tracked variants require integer base quantities.
- A whole-package rule rejects fractional package quantity.
- A transaction can use a package only when it is active and enabled for that transaction type.
- Unit dimension must be compatible with the variant's base unit.
- Cross-dimension conversion, such as kilograms to litres, is not allowed without a product-specific rule and is outside the initial design.

## 7. Conversion Changes

Changing a conversion can make prices, barcodes, open orders, and physical counts ambiguous. The recommended rule is:

1. Never update a conversion already used by a posted document.
2. End-date the old package definition.
3. Create a new effective package version.
4. Open documents retain their snapshot and should warn if fulfilled under an expired definition.
5. A barcode must resolve to the correct active or historically referenced package version.

Whether an identical barcode may be reused for a new conversion is an open business decision; the safer default is no.

## 8. Barcodes

- A barcode resolves within a company to a specific variant and packaging record.
- Barcode values should be unique among active company barcode aliases.
- Multiple aliases may identify the same package, such as manufacturer and internal labels.
- Scanning adds one package by default and converts it to base quantity.
- Variable-weight or price-embedded barcode formats require a separate parser and company configuration.
- Serial number scanning is a different action from package barcode scanning, even if both use the same device.
- Barcode creation, replacement, and collision resolution are audited.

## 9. Immutable Stock Ledger

The stock movement ledger is the source of truth for physical stock. A movement is append-only after posting.

Every movement records at least:

- Company
- Movement identifier and posting timestamp
- Effective business date
- Variant
- Base unit
- Signed base quantity
- Source and destination warehouse/location dimensions as applicable
- Batch and expiry identifiers when tracked
- Serial identifier when tracked
- Movement type
- Source document type, identifier, line identifier, and document number
- Reversal-of movement identifier when applicable
- Unit cost and value fields required by the valuation method
- Currency and exchange information where relevant
- Created by, posted by, and reason code
- Correlation or posting batch identifier

No screen, import, or administrator may directly edit a stock balance.

## 10. Movement Types

| Business action | Movement effect |
|---|---|
| Opening stock | Positive movement into opening location |
| Goods receipt | Positive movement into receiving or storage location |
| Supplier return | Negative movement from warehouse |
| Customer delivery | Negative movement from warehouse |
| Customer return accepted | Positive movement into saleable, quarantine, or return location |
| Positive adjustment | Positive movement with reason |
| Negative adjustment/disposal | Negative movement with reason |
| Transfer dispatch | Negative source and positive in-transit movement |
| Transfer receipt | Negative in-transit and positive destination movement |
| Production consumption | Negative input movement |
| Production output/by-product | Positive output movement |
| Production scrap | Negative or classified scrap movement |
| Reversal | Equal and opposite movement linked to original |

A transfer does not change total company stock, but it changes location ownership. Both sides must be present and linked.

## 11. Stock Balance Projection

For a variant and complete stock dimension:

`on hand = sum of posted movement base quantities`

For performance, the system may maintain a balance projection keyed by:

- Company
- Variant
- Warehouse
- Location
- Batch
- Serial, when applicable
- Stock status, such as available, quarantine, damaged, or in transit

The projection is a cache, not the legal source of truth. It must be rebuildable from the ledger and regularly reconciled.

Useful quantities:

- **On hand:** Posted physical quantity in the selected scope.
- **Reserved:** Quantity committed to open demand.
- **Available:** On hand minus valid reservations and blocked stock.
- **Incoming:** Approved open inbound quantity not yet received.
- **In transit:** Dispatched but not received transfer quantity.
- **Projected:** Available plus expected incoming minus expected demand.

## 12. Reservations

Reservations do not change on-hand stock and therefore do not create stock movements.

A reservation record includes company, demand line, variant, warehouse, base quantity, optional batch/serial allocation, status, expiry, and fulfillment link.

Rules:

- Reservation quantity uses the base unit.
- Active reservations cannot exceed allocatable stock when negative availability is blocked.
- Delivery consumes or releases reservations in the same transaction as stock posting.
- Cancellation and expiry release reservations.
- Concurrency control prevents two requests from reserving the same remaining quantity.
- Soft reservation versus hard allocation is a company policy decision.

## 13. Batches and Expiry

A batch belongs to a company and variant. It may contain supplier lot, internal lot, manufacture date, expiry date, status, and notes.

Rules:

- Batch-tracked movements require a batch.
- Expiry-managed products require an expiry date according to company policy.
- The same supplier lot text may exist for different variants but not ambiguously within one variant and policy scope.
- FEFO selects the earliest eligible expiry first.
- Expired, quarantined, recalled, or blocked batches are excluded from available stock.
- Batch attributes used in a posted receipt are audited; corrections are controlled.
- A trace report must follow a batch across receipt, transfer, sale, return, adjustment, and current balance.

## 14. Serial Numbers

A serial identifies one base unit of one variant.

Rules:

- Serial-tracked quantities are whole numbers.
- A serial cannot be on hand in two locations at once.
- Receipt activates or reintroduces a serial according to return policy.
- Delivery marks the serial as issued and links the customer and source document.
- Transfer preserves identity.
- A customer return must validate the serial and its prior issue where policy requires.
- Serial history is derived from ledger movements, not overwritten status alone.

## 15. Stock Status and Locations

Warehouses may contain locations such as receiving, bulk storage, picking, quarantine, damaged, returns, and dispatch.

Stock status determines whether quantity is sellable or allocatable. Moving between statuses creates a movement pair, even within one warehouse, so the history remains clear.

Location-level tracking can be optional per warehouse, but once used in posted movements it cannot be disabled without a controlled migration.

## 16. Negative Stock and Concurrency

The safe default is to reject a posting that would make eligible stock negative.

A controlled override, if allowed, requires:

- Explicit permission
- Reason code
- Company and warehouse policy
- Audit event
- Valuation method capable of later cost correction

Posting must lock or atomically validate the relevant balance keys so simultaneous sales, transfers, and adjustments cannot consume the same stock. Validation performed only when a screen opens is insufficient.

## 17. Returns

- Returns should reference original movements when possible.
- The returned base quantity cannot exceed the policy-allowed remaining quantity from the original issue or receipt.
- The original package is preserved for display, but stock is restored or removed in base units.
- Returned goods enter a chosen status/location; they are not automatically saleable.
- Batch and serial identity is preserved.
- Financial credit and physical stock return may occur at different times but remain linked.

## 18. Stock Counts and Adjustments

Counts accept package quantities for convenience but store normalized base quantities.

Count variance is:

`counted base quantity ? ledger snapshot base quantity`

Only the approved variance posts to the ledger. Every adjustment has a reason such as damage, expiry, found stock, shrinkage, data migration, or count correction. High-value or high-quantity changes require approval.

## 19. Inventory Valuation

Physical quantity and financial valuation are related but separate concerns.

Supported candidates:

- Moving weighted average
- FIFO cost layers
- Specific identification for serial-tracked or high-value items

Each posted movement stores or links the cost information needed to reproduce valuation. Negative stock complicates all methods and is another reason to block it by default.

Purchase package price is normalized for valuation:

`base unit acquisition cost = net package cost ? package conversion`

Landed costs may be allocated by quantity, weight, volume, value, or manual share if included in scope. Returns and reversals should use the related original cost where the valuation method permits.

## 20. Production and Repacking

Production records separate movements for input consumption, output, by-product, and scrap. A posting batch links them as one atomic business event.

Changing a display package does not move stock because stock already exists in base units. If the business needs to track sealed cartons, reusable containers, or package-level batch identity, that is a separate container or handling-unit feature rather than an ordinary unit conversion.

## 21. Data and Calculation Invariants

1. Every tenant-owned inventory record has a company identifier.
2. A movement's company matches its variant, warehouse, location, batch, serial, and source document.
3. Posted movement quantity is non-zero and expressed in the variant's base unit.
4. Posted movements cannot be updated or deleted.
5. Reversal movements are opposite, linked, and posted once.
6. A serial movement quantity has absolute value one unless a safely expanded representation is used.
7. Balance projections reconcile exactly to ledger totals.
8. Transaction lines retain the package and conversion snapshot used at entry.
9. Package prices do not determine stock quantity and conversions do not determine commercial price.
10. Stock and required accounting entries post in one transaction or through a recoverable, idempotent posting process that never exposes a half-posted document.
11. Decimal precision and rounding rules are explicit by unit, currency, tax, and valuation calculation.
12. All uniqueness and references include company scope where applicable.

## 22. Required Inventory Reports

- Stock on hand by variant, warehouse, location, status, batch, and serial
- Available, reserved, incoming, in-transit, and projected stock
- Stock movement ledger and document trace
- Stock valuation and valuation reconciliation
- Batch and serial traceability
- Expiry and near-expiry stock
- Slow-moving, non-moving, and dead stock
- Reorder and stockout report
- Transfer status and transfer differences
- Count variance and adjustment report
- Negative stock exception report
- Barcode and packaging conversion list
- Gross margin by variant and sold package, subject to permission

## Open Business Decisions

1. Which base-unit decimal precision is required for count, mass, volume, and length?
2. Are fractional quantities allowed for Pack, Box, and Carton?
3. Can custom units define conversions only within one dimension, or are product-specific cross-dimension rules required?
4. Can a barcode be reused after a packaging conversion changes?
5. Are variable-weight and price-embedded barcodes required?
6. Is negative stock ever permitted, and how is its cost corrected?
7. Which valuation method or methods are required at launch?
8. Are landed costs included in MVP, and which allocation bases are required?
9. Are reservations soft, hard, or selectable by company?
10. Does FEFO apply automatically, as a suggestion, or as a mandatory rule?
11. Can expired stock ever be sold with approval?
12. Are warehouse bins/locations mandatory or optional?
13. Is quality inspection needed between receiving and available stock?
14. Are handling units, pallets, sealed cases, or reusable containers required as tracked identities?
15. Is light assembly or full production required, and how should output cost be calculated?
16. Which events allow a serial to be reused or returned to available stock?
17. How are stock count snapshots and concurrent movements handled?
18. Which adjustments require approval by quantity, value, category, or reason?
