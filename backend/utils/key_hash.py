from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from core.log_util import logger_instance
import string
import secrets

class KeyUtil:
    def __init__(self):
        self.ph = PasswordHasher()
    

    def hash_API_key(self, api_key: str) -> str:
        return self.ph.hash(api_key)


    def verify_API_key(self, hash: str, api_key: str) -> bool:
        try:
            return self.ph.verify(hash, api_key)
        except VerifyMismatchError:
            return False
        except Exception as e:
            logger_instance.error(f"Error occurred verifying API key: {e}")


    def generate_API_key(self, length: int = 64) -> str:
        alphabet = string.ascii_letters + string.digits
        return "nsk_"+''.join(secrets.choice(alphabet) for _ in range(length))

