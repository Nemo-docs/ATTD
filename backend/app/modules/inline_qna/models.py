from ast import List
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class InlineQnaModel(BaseModel):
    """Model for storing inline Q&A data."""

    query: str = Field(description="The user's query text")
    page_id: str = Field(description="The ID of the page where the query originated")
    answer: str = Field(description="The answer to the user'squery")
    highlighted_text: Optional[List] = Field(description="Text highlighted User while asking query")
    resolved_context: Optional[str] = Field(description="Resolved context of the query")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last update timestamp"
    )

    @classmethod
    def from_request_data(
        cls, query: str, page_id: str, highlighted_text: Optional[List[str]],
        resolved_context: Optional[str], answer: str
    ):
        """Create model instance from request data."""
        return cls(
            query=query,
            highlighted_text=highlighted_text,
            resolved_context=resolved_context,
            page_id=page_id,
            answer=answer,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
