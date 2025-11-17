from fastapi import APIRouter, HTTPException, status, Request
from typing import Any, Dict
from uuid import UUID

from core.log_util import logger_instance

from app.modules.api_keys.services.key_manage import KeyManageService
from app.modules.api_keys.schemas import (
    APIKeyCreateRequest,
    APIKeyPlaintextResponse,
    APIKeyRevokeResponse,
    APIKeySummaryResponse,
)

# Create router
router = APIRouter(prefix="/keys", tags=["api-keys"])

key_manage_service = KeyManageService()


@router.post("/create", response_model=APIKeyPlaintextResponse)
async def create_api_key_endpoint(payload: APIKeyCreateRequest, req: Request):
    user_id = req.state.user_id
    api_key = await key_manage_service.create_api_key(
        user_id=user_id, name=payload.name, description=payload.description
    )
    logger_instance.info(f"Created API key {api_key} for user {user_id}")
    return APIKeyPlaintextResponse(api_key=api_key)

@router.put("/revoke/{api_key_id}", response_model=APIKeyRevokeResponse)
async def revoke_api_key_endpoint(api_key_id: UUID, req: Request):
    user_id = req.state.user_id
    revoked = await key_manage_service.revoke_api_key(api_key_id=api_key_id, user_id=user_id)
    if not revoked:
        raise HTTPException(status_code=404, detail="API key not found")
    logger_instance.info(f"Revoked API key {api_key_id} for user {user_id}")
    return APIKeyRevokeResponse(revoked=True)

@router.get("/list", response_model=list[APIKeySummaryResponse])
async def get_all_api_keys_endpoint(req: Request):
    user_id = req.state.user_id
    keys = await key_manage_service.get_all_active_keys(user_id=user_id)
    logger_instance.info(f"Retrieved {len(keys)} API keys for user {user_id}")
    return keys
