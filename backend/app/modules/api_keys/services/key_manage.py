from sqlalchemy import select, update
from sqlalchemy.exc import NoResultFound


from uuid import UUID
from datetime import datetime, timedelta

from core.postgres_db import AsyncSessionLocal
from core.log_util import logger_instance
from utils.key_hash import KeyUtil

from app.modules.api_keys.models import APIKey


class KeyManageService:
    def __init__(self):
        self.key_util = KeyUtil()
        
        # default values
        self.ttl_days=90
        self.rate_limit_daily=1000
        self.rate_limit_monthly=10000
        self.scopes=["mcp:all"]


    async def create_api_key(self, user_id: str, name: str, description: str | None,
    ) -> str:
        plaintext = self.key_util.generate_API_key()  
        hashed = self.key_util.hash_API_key(plaintext)

        expires_at = datetime.now(datetime.timezone.utc) + timedelta(days=self.ttl_days)

        async with AsyncSessionLocal() as session:
            async with session.begin():
                api_key = APIKey(
                    user_id=user_id,
                    key_hash=hashed,
                    scopes=self.scopes,
                    status="active",
                    name=name,
                    description=description,
                    rate_limit_daily=self.rate_limit_daily,
                    rate_limit_monthly=self.rate_limit_monthly,
                    expires_at=expires_at,
                )
                session.add(api_key)
                await session.flush()
                await session.refresh(api_key)

            # return plaintext once, never store it
            return plaintext


    async def revoke_api_key(self, api_key_id: UUID, user_id: str) -> bool:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                stmt = (
                    update(APIKey)
                    .where(APIKey.id == api_key_id, APIKey.user_id == user_id)
                    .values(status="revoked")
                    .execution_options(synchronize_session=False)
                )
                result = await session.execute(stmt)
                return result.rowcount > 0


    async def get_all_active_keys(self, user_id: str) -> list[dict]:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                stmt = select(APIKey.id, APIKey.name, APIKey.description).where(APIKey.user_id == user_id, APIKey.status=="active")
                res = await session.execute(stmt)
                return res.mappings().all() 
               