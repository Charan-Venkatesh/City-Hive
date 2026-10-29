"""Configure Gmail SMTP for CityHive and send a test email. The password is typed privately here
(never echoed, never printed) and saved only in backend/.env, which git ignores.

Gmail needs 2-step verification and an "app password": https://myaccount.google.com/apppasswords
Usage from backend/:  .venv/bin/python scripts/setup_email.py you@gmail.com
"""
import getpass, re, smtplib, ssl, sys
from email.message import EmailMessage
from pathlib import Path

ENV = Path(__file__).resolve().parents[1] / '.env'

def main(address):
    password = getpass.getpass('Gmail app password (input hidden): ').replace(' ', '')
    if len(password) < 8: sys.exit('That does not look like an app password.')
    settings = {'SMTP_HOST': 'smtp.gmail.com', 'SMTP_PORT': '587', 'SMTP_SECURITY': 'starttls',
                'SMTP_USERNAME': address, 'SMTP_PASSWORD': password, 'MAIL_FROM': address}
    msg = EmailMessage(); msg['From'] = address; msg['To'] = address; msg['Subject'] = 'CityHive test email'
    msg.set_content('This is a test from CityHive. If you can read it, reminder emails will work.')
    try:
        with smtplib.SMTP(settings['SMTP_HOST'], 587, timeout=20) as smtp:
            smtp.starttls(context=ssl.create_default_context()); smtp.login(address, password); smtp.send_message(msg)
    except Exception as exc:
        sys.exit(f'Test email failed ({type(exc).__name__}). Nothing was saved. Check the app password and 2-step verification.')
    lines = [l for l in (ENV.read_text().splitlines() if ENV.exists() else []) if not re.match(r'(SMTP_\w+|MAIL_FROM)=', l)]
    ENV.write_text('\n'.join(lines + [f'{k}={v}' for k, v in settings.items()]) + '\n'); ENV.chmod(0o600)
    print(f'Test email sent to {address}. Settings saved to backend/.env. Restart the backend to use them.')

if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(sys.argv[1])
