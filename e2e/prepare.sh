#!/bin/sh
# Builds an isolated test database (never touches staywell.db) with both branches and rooms.
set -e
cd "$(dirname "$0")/../backend"
rm -rf .e2e && mkdir -p .e2e
export DATABASE_URL="sqlite:///$PWD/.e2e/e2e.db" JWT_SECRET=e2e-secret-e2e-secret-e2e-secret-123 ADMIN_EMAIL=admin ADMIN_PASSWORD=E2e-Owner-Pass-1 ADMIN_PHONE=9000000001 JOBS_ENABLED=false
.venv/bin/python scripts/seed_branches.py >/dev/null 2>&1
.venv/bin/python scripts/seed_rooms.py >/dev/null 2>&1
sqlite3 .e2e/e2e.db "update rooms set monthly_fee=6000+capacity*1000"
