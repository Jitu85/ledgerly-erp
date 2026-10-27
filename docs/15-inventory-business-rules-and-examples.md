# Inventory Business Rules and Examples

A variant is a distinct stock identity; packaging is only a grouping of one variant. A 500 ml and 1 litre bottle are variants. Pack, box, carton, and pallet are packaging.

Base stock units never change after movement. Example: 1 box = 12 pieces and 1 carton = 10 boxes = 120 pieces. Three cartons post 360 pieces. Later packaging versions do not rewrite the snapshotted factor.

Batch-tracked stock requires a batch; a new expiry-managed batch requires expiry. Serial stock requires one unique serial per base unit. Negative stock is blocked. Transfers append linked out/in movements. Counts preserve system, counted, and variance quantities and post only variance.
