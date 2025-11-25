from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class PageModel(BaseModel):
    """Model representing a page in the system."""

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()), description="Unique page identifier"
    )
    user_id: str = Field(description="Owner user identifier", min_length=1)
    title: str = Field(description="Page title")
    content: str = Field(default="", description="Page content in markdown format")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Page creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Page last update timestamp"
    )
    repo_hash: str = Field(..., description="Associated repository hash")
    repo_name: str = Field(..., description="Associated repository name")

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
