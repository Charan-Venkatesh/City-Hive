import os
# Tests must not depend on a developer's local .env: keep one-time codes on unless a test turns them off.
os.environ['OTP_REQUIRED']='true'
