from pydantic import BaseModel


class APIKeyCreateRequest(BaseModel):
    name: str
    description: str | None = None

class APIKeyPlaintextResponse(BaseModel):
    api_key: str

class APIKeyRevokeResponse(BaseModel):
    revoked: bool

class APIKeySummaryResponse(BaseModel):
    key_prefix: str
    name: str
    description: str | None = None

    class Config:
        from_attributes = True
