from pydantic import BaseModel, Field
from datetime import datetime


class InlineQnaModel(BaseModel):
    """Model for storing inline Q&A data."""

    text: str = Field(description="The user's query text")
    cursor_position: dict = Field(description="The position of the cursor in the text")
    page_id: str = Field(description="The ID of the page where the query originated")
    answer: str = Field(description="The AI-generated answer to the query")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last update timestamp"
    )

    @classmethod
    def from_request_data(
        cls, text: str, cursor_position: dict, page_id: str, answer: str
    ):
        """Create model instance from request data."""
        return cls(
            text=text,
            cursor_position=cursor_position,
            page_id=page_id,
            answer=answer,
        )
