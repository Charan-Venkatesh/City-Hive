from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = 'postgresql+psycopg://hostel:hostel_local@localhost:5432/hostel'
    jwt_secret: str
    admin_email: str = 'owner@cityhive.local'
    admin_password: str
    admin_phone: str = ''
    smtp_host: str = 'localhost'
    smtp_port: int = 1025
    mail_from: str = 'billing@cityhive.local'
    jobs_enabled: bool = True
    app_environment: str = 'development'
    whatsapp_enabled: bool = False
    whatsapp_provider: str = 'cloud'
    whatsapp_phone_number_id: str = ''
    whatsapp_business_account_id: str = ''
    whatsapp_access_token: str = ''
    whatsapp_api_version: str = ''
    whatsapp_auth_template_name: str = ''
    whatsapp_reminder_template_name: str = ''
    whatsapp_verify_token: str = ''
    whatsapp_app_secret: str = ''
    whatsapp_country_code: str = '91'
    whatsapp_request_timeout: float = 8.0
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

settings = Settings()
