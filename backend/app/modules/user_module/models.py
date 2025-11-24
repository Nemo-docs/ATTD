"""Data models for the user module."""

from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel, Field

class RepoInfoModel(BaseModel):
    repo_hash: str = Field(
        ...,
        description="Repository hash",
    )
    repo_name: str = Field(
        ...,
        description="Repository name",
    )
    repo_url: str = Field(
        ...,
        description="Repository URL",
    )

class UserModel(BaseModel):
    """Represents an anonymous frontend user."""

    user_id: str = Field(
        ...,
        description="User identifier",
    )
    repo_infos: List[RepoInfoModel] = Field(
        default=[],
        description="List of repository information that the user has added to their dashboard",
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last update timestamp"
    )

    class Config:
        json_encoders = {datetime: lambda value: value.isoformat()}
