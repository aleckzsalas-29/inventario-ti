import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

JWT_SECRET = os.environ.get('JWT_SECRET', 'inventario-ti-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

PAC_PROVIDER = os.environ.get('PAC_PROVIDER', '')
PAC_API_KEY = os.environ.get('PAC_API_KEY', '')
PAC_API_SECRET = os.environ.get('PAC_API_SECRET', '')
PAC_SANDBOX = os.environ.get('PAC_SANDBOX', 'true').lower() == 'true'

CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
