from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from core.log_util import logger_instance
import string
import secrets
from typing import Dict

class KeyUtil:
    def __init__(self):
        self.ph = PasswordHasher()
    

    def argon_hash_API_key(self, api_key: str) -> str:
        return self.ph.hash(api_key)


    def argon_verify_API_key(self, hash: str, api_key: str) -> bool:
        try:
            return self.ph.verify(hash, api_key)
        except VerifyMismatchError:
            return False
        except Exception as e:
            logger_instance.error(f"Error occurred verifying API key: {e}")
            raise


    def generate_API_key(self) -> Dict[str, str]:
        alphabet = string.ascii_letters + string.digits
        prefix = "nsk_" + ''.join(secrets.choice(alphabet) for _ in range(24))
        key = prefix +'.' + ''.join(secrets.choice(alphabet) for _ in range(56))
        
        return {"prefix": prefix, "key": key}
        


