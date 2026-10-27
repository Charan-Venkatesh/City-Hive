#!/bin/sh
# Starts an isolated backend (port 8100) and the built frontend (port 5190), runs Playwright, then stops both.
cd "$(dirname "$0")"
sh prepare.sh || exit 1
E="$PWD/../backend/.e2e"
(cd ../backend && DATABASE_URL="sqlite:///$E/e2e.db" JWT_SECRET=e2e-secret-e2e-secret-e2e-secret-123 ADMIN_EMAIL=admin ADMIN_PASSWORD=E2e-Owner-Pass-1 ADMIN_PHONE=9000000001 JOBS_ENABLED=false APP_ENVIRONMENT=local WHATSAPP_ENABLED=true WHATSAPP_PROVIDER=test WHATSAPP_API_VERSION=v20.0 OTP_RESEND_SECONDS=30 OTP_REQUIRED=false DEV_PORT=8100 OTP_LOG="$E/otp.log" CORS_ORIGINS='["http://127.0.0.1:5190"]' .venv/bin/python scripts/dev_server.py >"$E/server.log" 2>&1) &
API=$!
python3 ../scripts/static_proxy.py ../frontend/dist 5190 http://127.0.0.1:8100 >/dev/null 2>&1 &
WEB=$!
trap 'kill $API $WEB 2>/dev/null; pkill -f "dev_server.py" 2>/dev/null' EXIT
for i in $(seq 1 40); do curl -sf http://127.0.0.1:8100/api/health >/dev/null && break; sleep 0.5; done
npx playwright test "$@"
