"""Local development server: writes sign-in codes to backend/.local/otp.log instead of WhatsApp/SMS.

Refuses to run unless APP_ENVIRONMENT=local and WHATSAPP_PROVIDER=test. Never use in production.
Run from backend/:  APP_ENVIRONMENT=local WHATSAPP_ENABLED=true WHATSAPP_PROVIDER=test python scripts/dev_server.py
"""
import os, sys
from datetime import datetime
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.config import settings
from app import whatsapp

LOG = Path(os.getenv('OTP_LOG') or ROOT / '.local' / 'otp.log')

def install():
    if settings.app_environment != 'local' or settings.whatsapp_provider != 'test' or not settings.whatsapp_enabled:
        raise RuntimeError('dev_server needs APP_ENVIRONMENT=local, WHATSAPP_PROVIDER=test, WHATSAPP_ENABLED=true')
    LOG.parent.mkdir(parents=True, exist_ok=True)
    def send(phone, code):
        whatsapp.normalize_phone(phone)
        with LOG.open('a') as f: f.write(f'{datetime.now():%H:%M:%S} code={code}\n')
    whatsapp.send_auth_code = send

if __name__ == '__main__':
    install()
    import uvicorn
    uvicorn.run('app.main:app', host='127.0.0.1', port=int(os.getenv('DEV_PORT', '8000')))
