# Deploy: frontend on Vercel, backend on Catalyst AppSail

Order matters: database → backend → frontend → CORS → scheduler.

## 1. PostgreSQL
Catalyst's own datastore cannot be used. Provision any managed PostgreSQL (Neon, Supabase, RDS, Aiven) reachable from AppSail and note the URL in the form `postgresql+psycopg://USER:PASS@HOST:5432/DB?sslmode=require`.

## 2. Backend (Catalyst AppSail)
From `backend/` with the Catalyst CLI (`npm i -g zcatalyst-cli`, `catalyst login`, `catalyst init` → AppSail → Python):

```sh
python -m pip install -r requirements.lock.txt   # AppSail does this from the lock file
catalyst deploy
```

`backend/app-config.json` sets the start command (`python -m app.serve`, which listens on `X_ZOHO_CATALYST_LISTEN_PORT`), production mode, `AUTO_MIGRATE=false` and `JOBS_ENABLED=false`.

Set these in the AppSail console (Environment Variables), never in git:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the PostgreSQL URL above |
| `JWT_SECRET` | 32+ random characters |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PHONE` | owner login; phone receives the sign-in code |
| `CORS_ORIGINS` | `["https://YOUR-APP.vercel.app"]` (exact HTTPS origins; add custom domain too) |
| `RELEASE_ID` | git commit |
| `JOB_RUNNER_TOKEN` | 32+ random characters |
| `FORWARDED_ALLOW_IPS` | AppSail proxy address(es) per Catalyst docs |
| `IDENTITY_DOCUMENT_KEY` | Fernet key (back up separately), if uploads are used |
| `WHATSAPP_*` or `SMS_ENABLED` + `TWILIO_*` | **required**: every login needs a one-time code |
| `SMTP_*` | email reminders |

Migrate once, from a machine that can reach the database, after a backup (`python scripts/db_maintenance.py backup <dir>`):

```sh
DATABASE_URL=... python -m alembic upgrade head
```

Verify: `https://<appsail-url>/api/health` → `{"status":"ok"}` and `/api/build` → `cityhive-api`.

## 3. Frontend (Vercel)
Import the repo, **Root Directory = `frontend`** (settings come from `frontend/vercel.json`; Node 22). Add the environment variable:

`VITE_API_BASE_URL = https://<appsail-url>/api`

It is applied at build time, so redeploy after changing it. Then put the resulting Vercel origin into the backend `CORS_ORIGINS` and restart AppSail.

## 4. Scheduler
AppSail may sleep, so reminders/automatic billing run from an external scheduler (Catalyst Cron, GitHub Actions or cron-job.org) every 15–60 min:

```sh
curl -X POST https://<appsail-url>/api/internal/jobs/run -H "X-Cityhive-Job-Token: $JOB_RUNNER_TOKEN"
```

Set `AUTOMATIC_BILLING_ENABLED=true` only when you want invoices created automatically.

## 5. First logins
- **Management:** sign in as `ADMIN_EMAIL` / `ADMIN_PASSWORD`, enter the code sent to `ADMIN_PHONE`. Then create branches, rooms, fee plans, and branch admins (they must change their password on first login).
- **Residents:** applicants submit the public admission form; staff approve and enrol, which creates the resident login. Residents sign in with their email, password and a code sent to the phone on their record.

## Not verified here
No Node, Docker, PostgreSQL or live deployment was available. Run `npm test && npm run build` in `frontend/`, and the smoke checks above, after deploying.
