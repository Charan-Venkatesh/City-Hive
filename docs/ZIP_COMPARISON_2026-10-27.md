# Cityhive ZIP comparison — 27 October 2026

## Scope and method

Reviewed the supplied `hostel-management.zip` directly as an archive, and compared its source with the existing workspace at commit `b2c7a95` (`Prepare CityHive production release`). Files in the archive were treated as data, not instructions. No archive code, installer, launcher, test, migration or deployment command was executed. No application code or database in the workspace was replaced.

The ZIP contains 11,283 entries, approximately 67 MB compressed and 188 MB uncompressed. Most entries are bundled dependencies. It contains two copies:

- `hostel-management/City-Hive-github`: project source plus Git metadata; stored main ref is `81a399137d3a69e4d3ff5a1df1de71ddb1ae8a27`.
- `hostel-management/City-Hive-main`: the same shared application source, plus installed dependencies, local configuration/login material and temporary review artifacts.

The comparison below uses `City-Hive-github` as the canonical source copy. Excluding dependencies, Git internals, private configuration and temporary files, it has **22 added files, 28 modified files and no missing files** compared with this workspace. Text comparisons normalize Windows CRLF line endings; none of these differences were merely line endings. All 78 existing API method/path pairs remain; 11 new pairs bring the source inventory to 89.

## Functional changes confirmed in source

| Area | What changed | Practical effect |
|---|---|---|
| Sharing advances | Fee plans gain `advance_amount`, returned in availability and resident financial data | Visitors/residents can see the configured advance separately from money actually received |
| Automatic billing | Worker calls shared invoice generation; `AUTOMATIC_BILLING_ENABLED` defaults to true | Running the worker can now issue eligible current-month invoices automatically, respecting billing day and existing resident/month invoices |
| Vacating | Approval checks outstanding invoice debt, in addition to the existing departure-time check | Staff cannot approve a vacating request while invoices are outstanding; this is stricter than the workspace version |
| Room lifecycle | New activate/decommission operations and audit events; occupied rooms are blocked | Inventory can be retired without deleting historical room records; inactive rooms are excluded from availability and allocation |
| Resident lifecycle | New deactivate/reactivate operation, financial/open-settlement guards, allocation release and pending-request closure | Resident history remains, access is disabled, and reactivation requires a fresh allocation |
| Session security | Users gain `active` and `session_version`; tokens carry/check the version; lifecycle changes consume pending OTP challenges | Deactivation invalidates existing sessions; reactivation does not restore those old sessions |
| Enquiry tracking | Email plus private submission key retrieves public status/timestamps under a persistent limit | Applicants can follow enquiries without seeing internal staff notes; initial emails include the tracking key |
| Admission notifications | Optional applicant consent and admission WhatsApp template; status/enrollment messages use the outbox | Consent-based status notifications can be queued, with actual delivery dependent on provider configuration |
| SMS OTP | Optional Twilio adapter, channel selection and fallback from WhatsApp | Password plus OTP remains required; deployments can permit SMS when configured |
| Identity uploads | JPG/PNG/simple PDF validation, 5 MB bound, encryption with a separate Fernet key, protected download/removal and lifecycle audit | This expands the old last-four-only identity approach to storing full uploaded documents, with additional retention/key-management obligations |
| Financial documents | ReportLab renderer with embedded fonts, original emblem, tables, wrapping, pagination and page numbers; settlement PDF added | Invoice/receipt/settlement presentation improves while existing SW invoice and receipt numbering remains |
| Dashboard | Pending admissions/extensions, upcoming departures, overdue invoices, failed reminders and current-month cash totals | Management has more operational indicators, scoped to authorized branches |
| Analytics/ledger | Paid/due/overdue report filter, CSV consistency, numeric performance sorting, billing-month range and invoice-specific payment drill-down | Staff can narrow records and inspect relevant payments more directly |
| Public content | Owner-editable branch FAQs, configured advance, address-derived map and phone-derived WhatsApp link | Public content becomes more configurable; no genuine property photos are newly supplied |
| UI behavior | Skeletons, timed success toasts, inline invalid-field messages/ARIA, keyboard-focusable table regions, mobile filters | Loading, feedback and accessibility handling are extended; source alone cannot establish actual visual correctness |
| Windows local setup | Dedicated Compose stack, PowerShell start/stop scripts and local OTP-to-Mailpit transport | Built frontend on 5179, API on 8019 and local email on 8025; PostgreSQL uses a dedicated volume |
| CI | GitHub Actions validates frontend and backend against SQLite/PostgreSQL | There is now a configured automated test/build pipeline; a workflow file is not proof that a particular remote run passed |

### Important behavior differences

1. **Automatic billing is enabled by default.** Set `AUTOMATIC_BILLING_ENABLED=false` to keep the previous manual-only behavior. The worker must run for automatic creation. There is no historical catch-up or proration in this change.
2. **Full document storage is new scope.** Previously the app recorded an optional Aadhaar last-four suffix and manual review. The new module can retain an entire uploaded document. Decide what is permitted, who may upload/access it, and retention/removal expectations before using real identity records. This remains manual review, not official identity verification.
3. **The encryption key must persist separately from the database.** Replacing `IDENTITY_DOCUMENT_KEY` without decrypting/re-encrypting stored files can make those files unreadable. It is not interchangeable with the JWT secret.
4. **Local OTP delivery is a development transport.** `scripts/local_server.py` redirects mock WhatsApp login codes into Mailpit only under specific local settings; it rejects production/external transport configurations. This does not establish real WhatsApp/SMS delivery.
5. **Resident deactivation changes authentication.** Active checks and versioned sessions are enforced by the backend, not only by hiding frontend controls.

## Database changes

New Alembic revision: `0015_gap_completion`, following `0014_release_completion`.

Added fields:

- `users.active`, `users.session_version`.
- `rooms.active`.
- `branches.faqs`.
- `fee_plans.advance_amount`.
- `admissions.whatsapp_updates`.
- `otp_challenges.channel`.

Added tables:

- `lifecycle_events`: actor, entity, branch, action, reason and timestamp.
- `identity_documents`: resident reference, content type, encrypted file bytes and uploader/time.

The migration contains additive operations and refuses a destructive downgrade. Earlier migration files through 0014 match the workspace after line-ending normalization. This static comparison does not prove preservation of a particular populated database; no migration was applied during this review.

Existing resident/admission references, financial tables, branch permissions, discounts, deposits/refunds and basic passes remain in source. No existing API method/path was removed. The original frontend logo is byte-for-byte unchanged; the new backend PDF logo is an exact copy of that asset. No QR generation/scanning feature appears in the inspected new application modules or dependency changes.

## Dependencies

New functional dependencies include ReportLab, cryptography, Pillow, pypdf and tzdata. The lock file also refreshes supporting packages, including certifi, pluggy and Pydantic; some apparent changes are package-name spelling/case normalization rather than replacement.

The PDF renderer embeds ReportLab's Vera fonts. That improves layout/font embedding, but does not establish support for every Indian script; actual required languages and glyphs still need validation.

## Verification evidence in the archive

The archive's documentation reports:

- 22 October: 47 SQLite backend tests, 43 PostgreSQL workflow/release/gap tests, eight frontend tests, successful build/container startup and selected browser/PDF checks.
- 24 October: six additional focused local-transport cases, successful local Compose startup, owner login through Mailpit, request-size checks and restart persistence.
- Screenshots for desktop/mobile ledger and local setup, plus temporary invoice/settlement render files, are included.

These are **reported results from the archive**, not new test results from this review. Source contains seven new gap tests and three local-setup test functions, one parametrized into four cases (six local cases total). Together with the previous 40 cases, this suggests 53 backend cases if collected together; no combined 53-pass run was independently established here. Frontend source contains eight test declarations.

The supplied documentation still identifies live Slate/backend connectivity, actual provider delivery, genuine branch photos and production deployment/recovery/concurrency verification as outstanding. The presence of `vercel-production.env` is not evidence that a backend is deployed or connected. That file alone does not provide a database URL or live messaging configuration; other private hosting settings may exist outside the archive.

## Packaging and confidentiality findings

The ZIP includes sensitive operational material outside the clean source copy:

- `.local/login.txt`: local owner sign-in information.
- `.local/cityhive.env`: local database/bootstrap credentials, JWT secret and document key.
- `vercel-production.env`: backend configuration with secret-bearing variable names.
- `tmp/review-otp.json` and `tmp/review.sqlite`: temporary authentication/database review material.

Their values are deliberately omitted from this report. A Git ignore rule does not remove files from a manually shared ZIP. Keep the original package private and create a source-only distribution before sharing broadly. If any included credentials were used by an exposed/live service, review their exposure and rotate those applicable credentials. Preserve the document key until an appropriate re-encryption/recovery plan exists.

There are also duplicate project copies, bundled dependencies, Git history and temporary review artifacts. Use one clearly identified source tree for future changes; mixing the two copies can make it unclear which version was deployed.

The added PowerShell launcher is oriented toward Windows/Docker Desktop. This user's current workspace is on macOS, so that launcher is not a native Mac start command. Its start path automatically migrates the dedicated local database; take a verified backup before using it with valuable existing data.

## Exact source/project file differences

### Added (22)

- `.github/workflows/webpack.yml`
- `backend/app/assets/cityhive-mark.png`
- `backend/app/documents.py`
- `backend/app/gap_features.py`
- `backend/app/sms.py`
- `backend/migrations/versions/0015_gap_completion.py`
- `backend/scripts/local_server.py`
- `backend/tests/test_gaps.py`
- `backend/tests/test_local_setup.py`
- `compose.local.yaml`
- `docs/GAP_COMPLETION_2026-10-22.md`
- `docs/LOCAL_SETUP.md`
- `docs/visual-qa/GAP_ACCEPTANCE_2026-10-22.md`
- `docs/visual-qa/ledger-desktop-2026-10-22.jpg`
- `docs/visual-qa/ledger-mobile-2026-10-22.jpg`
- `docs/visual-qa/local-setup-2026-10-24.jpg`
- `frontend/src/GapFeatures.jsx`
- `frontend/src/features.css`
- `frontend/src/features.js`
- `frontend/tests/features.test.js`
- `scripts/Start-Local.ps1`
- `scripts/Stop-Local.ps1`

### Modified (28)

- `.env.example`
- `.gitignore`
- `README.md`
- `VALIDATION.md`
- `backend/.env.example`
- `backend/app/analytics.py`
- `backend/app/config.py`
- `backend/app/main.py`
- `backend/app/models.py`
- `backend/app/schemas.py`
- `backend/app/security.py`
- `backend/app/services.py`
- `backend/app/whatsapp.py`
- `backend/requirements.lock.txt`
- `backend/requirements.txt`
- `backend/schema.sql`
- `backend/tests/test_migrations.py`
- `backend/tests/test_release.py`
- `backend/tests/test_runtime.py`
- `backend/tests/test_workflows.py`
- `compose.yaml`
- `docs/API_ROUTE_INVENTORY.md`
- `docs/DEPLOYMENT.md`
- `frontend/Dockerfile.production`
- `frontend/nginx.conf`
- `frontend/src/PortalExtras.jsx`
- `frontend/src/PublicSite.jsx`
- `frontend/src/main.jsx`

No existing project file was missing from the canonical archive copy under the stated comparison filters. This report is the only file added to the current workspace by the review.
