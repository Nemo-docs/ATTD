from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class InlineQnaModel(BaseModel):
    """Model for storing inline Q&A data."""

    query: str = Field(description="The user's query text")
    page_id: str = Field(description="The ID of the page where the query originated")
    answer: str = Field(description="The answer to the user'squery")
    resolved_query: Optional[str] = Field(description="Resolved query of the query")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last update timestamp"
    )
    user_id: str = Field(description="The ID of the user who asked the query")

    @classmethod
    def from_request_data(
        cls, query: str, page_id: str,
        resolved_query: Optional[str], answer: str, user_id: str
    ):
        """Create model instance from request data."""
        return cls(
            query=query,
            user_id=user_id,
            resolved_query=resolved_query,
            page_id=page_id,
            answer=answer,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
