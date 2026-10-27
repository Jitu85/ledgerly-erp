# Security and Audit Policy

## 1. Purpose

This policy defines the minimum security, privacy, access, and audit controls for the ERP platform. It applies to platform operators, company users, application code, infrastructure, integrations, support processes, and development practices.

Final legal and compliance obligations depend on the countries and industries served and require qualified review.

## 2. Security Principles

- Deny by default and grant least privilege.
- Treat company isolation as a primary security boundary.
- Require strong verification for privileged and high-risk actions.
- Keep posted business ledgers immutable.
- Minimize collection and exposure of personal and financial data.
- Protect data in transit, at rest, in backups, exports, logs, and support tools.
- Make material actions attributable to a person or service identity.
- Design recovery, reconciliation, and incident response before production.
- Automate preventive and detective controls where practical.

## 3. Data Classification

| Class | Examples | Minimum handling |
|---|---|---|
| Public | Published product help and marketing | Integrity control; approved publication |
| Internal | Non-sensitive configuration and internal operating metadata | Authenticated access and ordinary encryption |
| Confidential | Customer/supplier data, sales, purchases, inventory, financial reports | Tenant scope, least privilege, encryption, audited export |
| Highly confidential | Salary, bank accounts, government IDs, authentication data, security logs, API secrets | Separate permissions, masking, stronger encryption/access review, restricted support and export |

Credentials, access tokens, signing keys, encryption keys, and raw payment data are secrets, not ordinary business fields.

## 4. Identity and Authentication

- Use a standards-based OIDC identity provider.
- Require verified identity before company activation.
- Require MFA for Super Admin, Company Owner, Company Admin, Accountant, HR/Payroll, and other privileged roles; companies may require it for all users.
- Support step-up authentication for ownership transfer, bank/payment action, payroll finalization, sensitive role grant, data export, support access, and security reset.
- Use short-lived sessions according to risk and allow administrators to revoke sessions.
- Protect session cookies with `Secure`, `HttpOnly`, and appropriate `SameSite` settings.
- Rotate session identifiers after authentication and privilege changes.
- Rate-limit and monitor login, invitation, recovery, and MFA attempts.
- Do not disclose whether an unrelated tenant or user exists.
- Account recovery must not be weaker than normal authentication.
- Service identities use narrow scopes, rotation, and non-human credentials.

## 5. Authorization

Every server-side request must evaluate:

1. Authenticated identity
2. Active and eligible company membership
3. Company account status
4. Permission for the requested action
5. Branch, warehouse, department, employee, or record scope
6. Document state and ownership
7. Approval limit and segregation-of-duties rule
8. Step-up requirement for sensitive action
9. Support-session limitations when applicable

The user interface may hide unavailable actions, but the API and database remain authoritative.

Sensitive grants such as payroll access, payment release, period reopening, negative stock override, export, and support access are separate permissions and should receive periodic review.

## 6. Tenant Isolation

- Every tenant-owned record carries `company_id`.
- All queries and mutations include verified tenant context.
- PostgreSQL row-level security provides defense in depth.
- The normal application database role cannot bypass tenant policy.
- Foreign keys and uniqueness constraints prevent accidental cross-company links.
- Cache keys, object-storage paths, jobs, exports, search indexes, logs, and webhook deliveries carry tenant context.
- Background workers establish company context before accessing data.
- Report aggregation applies scope before calculation.
- Automated tests replace valid identifiers with another tenant's identifiers and verify non-disclosure.
- Platform administrators use separate identities, routes, database roles, and audit records.

A tenant-isolation failure is a high-severity security incident even when no harmful intent is found.

## 7. Super Admin and Support Access

- Super Admin accounts are never shared and always use MFA.
- Routine Super Admin screens show platform metadata, not unrestricted company business data.
- Support access requires a case, reason, requested scope, and expiry.
- Company approval is required when policy or contract demands it.
- The interface clearly identifies an active support session.
- Sensitive fields remain masked unless separately authorized.
- Every company read, export, and action during support is attributable to the support user, not impersonated as the company user.
- Break-glass access is time-limited, alerts security personnel, and requires post-use review.
- Privileged roles and support sessions are reviewed regularly.

## 8. Data Protection

### Encryption

- TLS is required for all network communication.
- Managed encryption is required for databases, replicas, object storage, queues, logs, and backups.
- Highly confidential fields such as bank accounts or government identifiers should use field-level encryption or tokenization where threat and query needs justify it.
- Encryption keys reside in managed key services and are separated from application data.
- Key rotation and revocation procedures must be tested.

### Masking and Minimization

- Lists, logs, notifications, search results, and support tools show only the fields needed.
- Bank, government ID, tax ID, salary, and personal contact details are masked by default.
- Non-production environments use synthetic or properly anonymized data.
- Error reports and observability tools redact tokens, passwords, cookies, authorization headers, bank fields, and sensitive payroll values.

### Attachments and Exports

- Validate file type and size and scan files for malware.
- Store objects under unguessable tenant-scoped keys.
- Use short-lived signed download links after authorization.
- Apply retention and legal hold to both metadata and content.
- Export generation and download are audited.
- Highly sensitive exports may require step-up authentication, approval, watermarking, or password-protected delivery according to policy.

## 9. Application Security

- Validate request shape, type, range, unit precision, state, and authorization at the server boundary.
- Use parameterized SQL and allow-listed sorting/filtering.
- Encode output and enforce a restrictive Content Security Policy.
- Protect state-changing browser requests from CSRF.
- Restrict cross-origin access.
- Validate redirect and callback destinations.
- Rate-limit high-risk and expensive routes by identity, company, client, and source.
- Apply request body, file, query-time, and export limits.
- Prevent server-side request forgery through URL allow-lists and protected network egress.
- Sign webhooks, verify timestamps, and prevent replay.
- Make posting and payment commands idempotent.
- Never deserialize or execute tenant-provided code in the core application.
- Review custom templates and formulas as untrusted input.

## 10. Ledger and Business Integrity Controls

- Posted stock movements and accounting journal lines cannot be updated or deleted.
- Corrections use linked reversals and replacements.
- Posting validates document version, period, approval, stock, tracking, and balanced accounting.
- Source state, stock movements, journals, projections, audit, and outbox commit atomically.
- Document numbers and posting identifiers are unique within their defined scope.
- High-risk overrides require reason, permission, and audit.
- Automated reconciliation compares stock projection to movement ledger and subledgers to control accounts.
- Payroll calculation preserves input and rule versions.
- Raw attendance events are retained; corrections form a separate approved layer.

## 11. Audit Policy

### Audit Record Requirements

A material audit event records:

- Unique event ID and UTC timestamp
- Company or platform scope
- Actor type and identifier
- Effective user and support-session identifier where applicable
- Action and outcome
- Target type, identifier, and human-readable reference
- Before and after summary for mutable business/configuration data
- Reason code or comment when required
- Request/correlation ID
- Source IP and relevant client/device context, with privacy controls
- Authentication strength or step-up indicator for high-risk events
- Related approval, posting batch, reversal, export, or support case

Audit records are append-only to application users. Access to audit data is itself controlled and logged.

### Events That Must Be Audited

- Registration, company activation, suspension, reactivation, closure, and ownership transfer
- Login success/failure, MFA, recovery, session creation/revocation, and risk blocks
- Invitation, user activation/deactivation, role, permission, scope, and delegation changes
- Approval policy and decision changes
- Product, variant, package conversion, barcode, price, tax, account, warehouse, and payroll rule changes
- Submission, approval, rejection, posting, cancellation, reversal, reopening, and override
- Stock movement, adjustment, transfer difference, negative-stock override, batch/serial status, and count posting
- Journal, payment, reconciliation, period lock/reopen, and bank detail access/change
- Employee, compensation, attendance correction, leave, payroll calculation, approval, finalization, payslip access, and payment-file generation
- Import, export, report download, attachment access, API client, webhook, and integration changes
- Super Admin, support, impersonation-like access, break-glass, and privileged infrastructure actions
- Security configuration, secret/key operations, retention, deletion, legal hold, backup restore, and incident actions

Routine low-risk reads need not all become business audit events, but highly confidential reads, exports, support reads, and suspicious access should be recorded.

### Audit Integrity and Retention

- Audit events are written in the same transaction as material business changes where possible.
- Events are forwarded to centralized, access-restricted storage for detection and long-term retention.
- Tamper-evident controls such as immutable object retention or cryptographic chaining may be added based on compliance needs.
- Clock synchronization is monitored.
- Retention varies by event class and legal requirement but must be documented before launch.
- Auditors receive read-only, scoped, time-limited access.

## 12. Monitoring and Detection

Alert on:

- Repeated authentication or MFA failures
- Unusual privileged access or role escalation
- Cross-tenant policy denials
- Large or unusual exports
- Break-glass and support-session use
- Negative stock overrides and large adjustments
- Period reopening, journal reversal, payment/payroll anomalies
- Webhook signature failure and API abuse
- Malware detections
- Backup, replication, outbox, reconciliation, and security-control failures
- Unexpected access from new regions or impossible travel where lawful and useful

Alerts require severity, owner, response target, evidence, and closure notes. Monitoring must avoid placing confidential content in alert channels.

## 13. Infrastructure and Secrets

- Separate development, test, staging, and production accounts/projects.
- Production access uses individual identities, MFA, least privilege, time limits, and audit.
- No direct public database or Redis access.
- Network rules limit service-to-service communication and administrative paths.
- Secrets are stored in a managed secret service and rotated.
- Infrastructure is defined and reviewed as code.
- Container images use minimal trusted bases, non-root execution, and scanning.
- Patches follow severity-based service targets.
- Administrative actions use controlled tooling and are logged.

## 14. Secure Development Lifecycle

- Threat-model tenant isolation, posting, payments, payroll, support, file handling, and integrations.
- Review architecture and schema changes that affect security boundaries or ledgers.
- Require peer review and protected branches.
- Run static analysis, dependency review, secret scanning, infrastructure scanning, and test suites in CI.
- Maintain a software bill of materials for production artifacts.
- Pin and update dependencies through a controlled process.
- Perform penetration testing before launch and after material boundary changes.
- Track vulnerabilities to remediation with severity and ownership.
- Provide a security reporting channel and coordinated disclosure process.

## 15. Backup, Recovery, and Continuity

- Encrypt backups and restrict restore authority.
- Use point-in-time recovery for the primary database.
- Version or protect object storage according to retention needs.
- Keep restoration procedures and infrastructure rebuild instructions current.
- Test database and attachment restoration regularly.
- Reconcile ledgers and projections after recovery.
- Define RPO, RTO, regional failure, and communication procedures.
- Do not claim recovery objectives until tests demonstrate them.

## 16. Incident Response

1. Detect and classify the event.
2. Preserve evidence and establish an incident record.
3. Contain compromised identities, tenants, integrations, or systems.
4. Determine affected data, companies, periods, and business records.
5. Eradicate cause and restore from trusted state.
6. Reconcile stock, accounting, payroll, audit, and integration delivery.
7. Notify affected parties and authorities according to contract and law.
8. Complete a blameless review with corrective actions and deadlines.

Security staff must be able to suspend a session, API client, support session, company, integration, or feature without deleting evidence.

## 17. Privacy and Data Subject Operations

- Document data purposes, categories, processors, regions, and retention.
- Collect only data needed for stated business purposes.
- Provide controlled access, correction, export, and deletion/anonymization workflows as legally applicable.
- Do not delete records that must remain for accounting, employment, tax, fraud, or legal hold; restrict and anonymize where permitted.
- Ensure subprocessors and cross-border transfers are reviewed.
- Include backup expiry and derived analytics in deletion design.
- Keep consent separate from contractual or legal processing where applicable.

## 18. Third-Party and Integration Security

- Review identity, billing, email, storage, monitoring, banking, device, and payroll providers.
- Document data shared, region, retention, breach terms, and access controls.
- Grant each integration minimum scopes.
- Store provider credentials in the secret manager.
- Verify inbound signatures and sign outbound webhooks.
- Provide credential rotation, revocation, delivery retry, and audit history.
- Prevent one tenant from configuring callbacks to internal/private network targets.

## 19. Access Reviews

Recommended review frequency:

- Super Admin and break-glass access: at least monthly
- Company privileged roles and payroll/payment permissions: at least quarterly
- Service accounts and API clients: at least quarterly
- Auditor and temporary support access: at expiry and periodically
- Dormant users: monthly detection and company follow-up
- Segregation-of-duties conflicts: continuously detected and periodically certified

Final frequencies depend on compliance and customer contracts.

## Open Business Decisions

1. Which privacy, employment, tax, financial, and industry laws apply in launch markets?
2. Are SOC 2, ISO 27001, PCI DSS, HIPAA-like, or other certifications required?
3. What MFA methods and session lifetimes are required by role?
4. Does every support session require company consent?
5. Which fields require field-level encryption, tokenization, or customer-managed keys?
6. Which audit events and business records have which retention periods?
7. Are immutable/WORM audit archives required?
8. What availability, RPO, RTO, and incident notification times are contractual?
9. Which roles may export customer, financial, employee, or payroll data?
10. Is IP allow-listing required for administrators or API clients?
11. Which payment data enters the platform, and can hosted provider pages keep it outside PCI scope?
12. Which production regions and subprocessors are permitted?
13. What vulnerability remediation and penetration-test frequency will be committed?
14. What company and platform actions require step-up authentication or dual control?
15. How will legal holds, company closure, and data deletion requests interact?
