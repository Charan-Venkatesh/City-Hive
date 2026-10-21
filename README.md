# Cityhive Luxury PG's and Co-space — management platform

Cityhive is the existing React + FastAPI application extended for two-branch operations. The backend supports SQLite for local development and PostgreSQL through the supplied Compose configuration. It is an operational prototype for the workflows listed below, not a production-ready property-management system; see [VALIDATION.md](VALIDATION.md) for the latest verification and known gaps.

## Implemented workflows

- Owner, branch-admin, and resident password authentication followed by a WhatsApp OTP challenge before a JWT session is issued. Argon2 password hashing and forced password change for newly assigned branch administrators remain in place. WhatsApp is disabled until configured.
- Owner-managed branches and branch-admin assignments. Owners can operate across branches; branch admins are scoped to their assigned branches; residents can access only their own records.
- Room creation/editing, capacity checks, allocations, allocation history, manual identity-document review history, and branch inventory.
- Public branch listings and live room availability; admission requests are deduplicated and reviewed by authorized staff. Approved requests can be enrolled, then allocated through the normal room workflow.
- Resident stay requests for extension, shift, and vacating. Staff review requests; accepted shifts produce allocation history. Approved vacating retains the room until the scheduled date and outstanding invoice balances are settled.
- Branch- and sharing-specific effective-dated fee plans with configurable billing and due days and optional labelled monthly charges. Issued invoices preserve their base rate, discount, configured add-on, total and due date as snapshots.
- Monthly invoice snapshots, fixed monthly discounts, manual cash/UPI/bank payment recording, partial payments, idempotent payment keys, receipts, and downloadable PDF invoices.
- Separate deposit and advance ledgers for money actually received, reasoned deductions, and final settlement snapshots. Staff approval and the record of an actual refund are separate actions; the application does not automatically offset invoice balances or impose a deposit-forfeiture rule.
- Daily due-invoice reminder queueing and an email outbox worker with retries and deduplication. Consenting residents can be queued for WhatsApp utility-template reminders when the provider is configured. Local Compose routes email to Mailpit.
- Cash/UPI/bank ledger records with payment-time and payer notes, audited reversals, and transaction-based receipt balances. An owner/branch-scoped financial analytics report provides collection, aging, delay, room, resident, overdue invoice, and CSV views.
- Resident complaint submission, branch-authorized staff assignment, responses, resolution notes, timestamps and append-only history. Staff visibility and assignment choices are branch-scoped.
- Automatically generated unique resident reference codes and private, branch-scoped basic gate-pass records. Authorized staff can issue, print, and revoke passes; residents can view and print only their own. Pass validity ends on expiry, revocation, or resident vacating. Gate passes do not include scanning or code-validation workflows.
- Admin/resident dashboards and branch-scoped records.

Identity review is manual and stores only an optional last-four suffix. It is not UIDAI verification. Payments are bookkeeping only; there is no payment gateway. The PDF invoice records configured charges and makes no tax or statutory-registration claims.

## WhatsApp setup

WhatsApp delivery is disabled by default. Configure `WHATSAPP_ENABLED=true`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_API_VERSION`, `WHATSAPP_AUTH_TEMPLATE_NAME`, and `WHATSAPP_REMINDER_TEMPLATE_NAME` in the backend environment only after the corresponding Meta account and approved templates are ready. `ADMIN_PHONE` must be set to the owner's actual number before first owner provisioning; existing owner numbers are not overwritten. Residents use the registered number on their resident record. Test mode is available only outside production and must not be enabled for production deployments. No real-provider delivery has been verified in this workspace.

## Local setup

Copy `.env.example` to `.env` and set a unique `JWT_SECRET`, owner password, and the owner's actual `ADMIN_PHONE`. The root `.env` configures Compose, including optional WhatsApp settings. Backend-local development also reads `backend/.env`; set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_PASSWORD`, and `ADMIN_PHONE` there. Keep both files private and preserve existing environment values when upgrading.

With Docker Compose available:

```sh
docker compose up --build -d
```

Open `http://localhost:5173` for the application, `http://localhost:8000/docs` for the API, and `http://localhost:8025` for the local Mailpit inbox. The API migrates the database to Alembic `head` during startup. PostgreSQL data lives in the `hostel_db` volume.

For local backend development, from `backend/` install `requirements.lock.txt`, then run:

```sh
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

Run the frontend from `frontend/` with `npm ci` and `npm run dev`. The Vite development server proxies `/api` to `localhost:8000`.

The authenticated backend API exposes `GET /api/analytics/financial` and `GET /api/analytics/financial.csv` to staff, with branch-admin scope applied before aggregation. Staff manage effective-dated pricing through `/api/fee-plans`, and can assign a plan to a resident through `/api/residents/{id}/fee-plan`. Deposit/advance ledger entries and final settlements use `/api/residents/{id}/financial-ledger` and `/api/settlements`; approval does not mark a refund paid until an actual refund entry is recorded. Complaint assignments use `/api/complaints/{id}/assignment` and are limited to staff authorized for the complaint branch. Residents can view and update their WhatsApp payment-reminder consent at `/api/my/notification-preferences`. Basic gate-pass listing, issuance, and revocation use `/api/gate-passes` with resident and branch authorization.

## Migration safety

Alembic revisions are in `backend/migrations/versions`. Startup upgrades the configured database to `head`; do not use `Base.metadata.create_all()` to evolve an existing deployment. Revision `0001` maps existing room/resident rows using their current relationships. If multiple branches exist and a row has no resolvable branch, it stops and requires an explicit data-owner decision rather than choosing a branch. Revision `0008` backfills historical invoice branch attribution from the resident's current branch; prior branch history cannot be recovered for invoices where the resident moved before that migration. Revision `0009` indexes payment transaction timestamps for report queries. Re-running the upgrade is safe. Downgrades intentionally stop instead of dropping application data; take a database backup before any migration.

Revisions `0011` and `0012` add append-only complaint history, backfilled unique resident codes, and branch-scoped gate passes. Revision `0013` adds effective-dated fee plans and invoice charge snapshots, deposit/advance and settlement audit ledgers, complaint assignment/resolution fields, and historically created a gate-pass validation-events table. Current application code does not map, expose, or write that legacy table; the applied migration and any existing records are retained without a destructive schema change. Revision `0013` uses Alembic batch operations for SQLite foreign-key changes and intentionally refuses downgrade rather than dropping new user data.

To inspect the migration version, run `python -m alembic current` from `backend/`. To upgrade manually, run `python -m alembic upgrade head`.

## Validation

Run the backend suite from `backend/` with `.venv/bin/python -m pytest -q`. Tests use a fresh isolated SQLite database by default. If `TEST_DATABASE_URL` is set, the test guard requires a disposable database name ending in `_test`; the workflow fixture drops and recreates its application tables.

A frontend build can be run with `npm run build` where Node/npm are installed. See [VALIDATION.md](VALIDATION.md) for the actual commands and results from this workspace, plus deployment and feature gaps.
