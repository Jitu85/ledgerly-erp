# Purchase API Reference

All routes are below `/api/v1/purchase`, require an access token, verified active company, and server-side permission guard. `company_id` is never accepted as authority.

- `GET/POST /suppliers`, `GET/PATCH/DELETE /suppliers/:id`
- `GET/POST /suppliers/:supplierId/contacts`, `PATCH/DELETE /suppliers/:supplierId/contacts/:id`
- `GET/POST /suppliers/:supplierId/addresses`, `PATCH/DELETE /suppliers/:supplierId/addresses/:id`
- `GET/POST /requisitions`, `GET/PATCH /requisitions/:id`
- `POST /requisitions/:id/submit`, `/decision`, `/cancel`, `/convert-to-order`
- `GET/POST /orders`, `POST /orders/:id/submit`, `/orders/:id/decision`, `/orders/:id/cancel`
- `POST /goods-receipts/post`
- `POST /invoices`
- `POST /returns/post`
- `POST /landed-costs`
- `POST /payments`

Receipt and return posting use the existing inventory service inside the purchase database transaction. Safe errors include `RESOURCE_NOT_FOUND`, `INVALID_WORKFLOW_STATE`, `SUPPLIER_INACTIVE`, `RECEIPT_TOLERANCE_EXCEEDED`, `TRACKING_DATA_REQUIRED`, `DUPLICATE_SERIAL`, `RETURN_EXCEEDS_RECEIVED`, `INSUFFICIENT_STOCK`, and `PAYMENT_OVER_ALLOCATION`.

Invoice decision endpoints, document rendering/export, and dedicated outstanding/history query endpoints remain deferred from the current HTTP surface.
