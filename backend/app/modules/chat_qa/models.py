from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ChatQaModel(BaseModel):
    """Model for storing chat Q&A data."""

    id: str = Field(..., description="Unique response ID")
    message: str = Field(..., description="The user's message")
    response: str = Field(..., description="The AI-generated response")
    conversation_id: Optional[str] = Field(
        None, description="Associated conversation ID"
    )
    page_id: Optional[str] = Field(None, description="Associated page ID")
    model_used: str = Field(..., description="The AI model used")
    tokens_used: int = Field(..., description="Number of tokens used")
    user_id: str = Field(..., description="Owner user identifier")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last update timestamp"
    )

    @classmethod
    def from_request_data(
        cls,
        id: str,
        message: str,
        response: str,
        model_used: str,
        tokens_used: int,
        conversation_id: Optional[str] = None,
        page_id: Optional[str] = None,
        user_id: str = "",
    ):
        """Create model instance from request data."""
        return cls(
            id=id,
            message=message,
            response=response,
            conversation_id=conversation_id,
            page_id=page_id,
            model_used=model_used,
            tokens_used=tokens_used,
            user_id=user_id,
        )


class ChatConversationModel(BaseModel):
    """Model for storing chat conversation data."""

    id: str = Field(..., description="Unique conversation ID")
    title: str = Field(..., description="Conversation title")
    page_id: Optional[str] = Field(None, description="Associated page ID")
    message_count: int = Field(
        default=0, description="Number of messages in conversation"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last update timestamp"
    )
    user_id: str = Field(..., description="Owner user identifier")

    @classmethod
    def from_request_data(
        cls,
        id: str,
        title: str,
        page_id: Optional[str] = None,
        user_id: str = "",
    ):
        """Create model instance from request data."""
        return cls(
            id=id,
            title=title,
            page_id=page_id,
            user_id=user_id,
        )
