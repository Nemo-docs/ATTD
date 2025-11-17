from fastapi import HTTPException, status
from sqlalchemy import select
from typing import Dict
from core.clients import redis_client
from core.postgres_db import AsyncSessionLocal
from core.log_util import logger_instance
from utils.key_hash import KeyUtil
from app.modules.api_keys.models import APIKey


key_util = KeyUtil()


async def get_key_context(raw_key: str) -> Dict[str, str]:

    # Stable fingerprint for Redis caching (no plaintext stored)
    hashed_key = key_util.hash_API_key(raw_key)
    cache_key = f"api_key_fp:{hashed_key}"

    # Fast path: try to get user_id from Redis
    try:
        cached_user_id = await redis_client.get(cache_key)
        if cached_user_id:
            return {"user_id": cached_user_id}
        
        else:

            # Cold path: verify against stored Argon2 hashes of active keys and cache user_id
            async with AsyncSessionLocal() as session:
                stmt = select(APIKey.user_id).where(APIKey.key_hash == hashed_key, APIKey.status == "active")
                res = await session.execute(stmt)
                user_id = res.scalar_one_or_none()

            if user_id:
                # Cache user_id for faster subsequent lookups (1h TTL)
                await redis_client.set(cache_key, user_id, ex=3600)
                return {"user_id": user_id}
            
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid API key",
                )
    except Exception as e:
        logger_instance.error(f"Redis get failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify API key",
        )
