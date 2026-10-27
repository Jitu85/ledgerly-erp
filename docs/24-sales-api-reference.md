# Sales API Reference

All routes are below `/api/v1/sales`, require an access token, verified active company and server-side permission guard. `company_id` is never accepted as authority.

- `GET/POST /customers`, `GET/PATCH/DELETE /customers/:id`
- `GET/POST /customers/:id/contacts`, `GET/POST /customers/:id/addresses`
- `GET/POST /price-lists`
- `GET/POST /quotations`, `POST /quotations/:id/action`
- `GET/POST /orders`, `POST /orders/:id/action`
- `GET/POST /reservations`
- `GET /deliveries`, `POST /deliveries/post`
- `GET/POST /invoices`
- `GET /returns`, `POST /returns/post`
- `GET/POST /credit-notes`
- `GET/POST /payments`
- `GET /outstanding`

Dispatch and return commands call the inventory service inside the sales tenant transaction. Safe errors include `RESOURCE_NOT_FOUND`, `CUSTOMER_INACTIVE`, `INVALID_WORKFLOW_STATE`, `CREDIT_LIMIT_EXCEEDED`, `INSUFFICIENT_AVAILABLE_STOCK`, `INSUFFICIENT_STOCK`, `TRACKING_DATA_REQUIRED`, `SERIAL_UNAVAILABLE`, `DISPATCH_EXCEEDS_ORDER`, `RETURN_EXCEEDS_DISPATCH`, and `PAYMENT_OVER_ALLOCATION`.

PDF rendering/export, attachment upload, manual credit adjustment approval, reservation expiry jobs and dedicated history/report endpoints remain deferred.
