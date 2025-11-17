from pydantic import BaseModel
from uuid import UUID


class APIKeyCreateRequest(BaseModel):
    name: str
    description: str | None = None

class APIKeyPlaintextResponse(BaseModel):
    api_key: str

class APIKeyRevokeResponse(BaseModel):
    revoked: bool

class APIKeySummaryResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None

    class Config:
        from_attributes = True
