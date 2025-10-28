"""Data models for the user module."""

from datetime import datetime
from typing import Any, Dict

from pydantic import BaseModel, Field


class UserModel(BaseModel):
    """Represents an anonymous frontend user."""

    user_id: str = Field(
        ...,
        min_length=16,
        max_length=16,
        description="16 digit identifier",
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last update timestamp"
    )

    class Config:
        json_encoders = {datetime: lambda value: value.isoformat()}
