from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
import uuid


class SnippetModel(BaseModel):
    """
    Model representing a single snippet (short text paragraph / code).
    """

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()), description="Unique snippet identifier"
    )
    user_id: str = Field(..., description="Owner user identifier", min_length=1)
    content: str = Field(..., description="Snippet content (text or code)")
    tags: List[str] = Field(default_factory=list, description="Optional tags for the snippet")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Creation timestamp")
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Last update timestamp")

class SnippetsModel(BaseModel):
    """
    Model representing a collection of snippet ids for a user.
    This stores snippet ids so the system can manage groupings or quick lookups.
    """

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()), description="Unique collection identifier"
    )
    user_id: str = Field(..., description="Owner user identifier", min_length=1)
    snippet_ids: List[str] = Field(default_factory=list, description="List of snippet ids")
    deleted_snippet_ids: Optional[List[str]] = Field(default_factory=list, description="List of deleted snippet ids")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    last_unix_timestamp: int = Field(default=int(datetime.now().timestamp()), description="Last unix timestamp")

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


