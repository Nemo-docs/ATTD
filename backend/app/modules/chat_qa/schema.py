from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ChatQaRequest(BaseModel):
    """Request schema for chat Q&A functionality."""

    message: str = Field(
        ...,
        description="The user's chat message",
        example="What is the capital of France?",
        min_length=1,
        max_length=2000,
    )
    conversation_id: Optional[str] = Field(
        None,
        description="Optional conversation ID for maintaining chat history",
        example="conv_1234567890",
    )
    page_id: Optional[str] = Field(
        None,
        description="Optional page ID for context-specific queries",
        example="page_1234567890",
    )
    repo_hash: Optional[str] = Field(
        None,
        description="Optional repository hash (repoId) to provide project-specific context",
        example="a1b2c3d4...",
    )
    diagram_mode: Optional[bool] = Field(
        False,
        description="Optional flag to enable diagram generation mode",
        example=False,
    )
    think_level: Optional[str] = Field(
        "simple",
        description="Thinking level for responses: 'simple' or 'detailed'",
        example="simple",
    )
    user_id: str = Field(
        ...,
        description="Identifier of the user initiating the chat",
        example="1234567890123456",
        min_length=1,
    )


class ChatQaResponse(BaseModel):
    """Response schema for chat Q&A functionality."""

    id: str = Field(
        ...,
        description="Unique response ID",
        example="resp_1234567890",
    )
    message: str = Field(
        ...,
        description="The user's original message",
        example="What is the capital of France?",
    )
    response: str = Field(
        ...,
        description="The AI-generated response",
        example="The capital of France is Paris.",
    )
    conversation_id: Optional[str] = Field(
        None,
        description="Conversation ID if provided",
        example="conv_1234567890",
    )
    page_id: Optional[str] = Field(
        None,
        description="Page ID if provided",
        example="page_1234567890",
    )
    diagram_mode: Optional[bool] = Field(
        False,
        description="Indicates if the response was generated in diagram mode",
        example=False,
    )
    model_used: str = Field(
        ...,
        description="The AI model used to generate the response",
        example="openai/gpt-4o-mini",
    )
    tokens_used: int = Field(
        ...,
        description="Number of tokens used in the request",
        example=150,
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Creation timestamp",
        example="2025-01-01T00:00:00Z",
    )
    user_id: Optional[str] = Field(
        None,
        description="Identifier of the user owning the response",
        example="1234567890123456",
    )


class ChatConversationRequest(BaseModel):
    """Request schema for creating a new chat conversation."""

    title: Optional[str] = Field(
        None,
        description="Optional title for the conversation",
        example="General Questions",
        max_length=200,
    )
    page_id: Optional[str] = Field(
        None,
        description="Optional page ID for context",
        example="page_1234567890",
    )
    user_id: str = Field(
        ...,
        description="Identifier of the user owning the conversation",
        example="1234567890123456",
        min_length=1,
    )


class ChatConversationResponse(BaseModel):
    """Response schema for chat conversation information."""

    id: str = Field(
        ...,
        description="Unique conversation ID",
        example="conv_1234567890",
    )
    title: str = Field(
        ...,
        description="Conversation title",
        example="General Questions",
    )
    page_id: Optional[str] = Field(
        None,
        description="Associated page ID if any",
        example="page_1234567890",
    )
    message_count: int = Field(
        ...,
        description="Number of messages in the conversation",
        example=5,
    )
    created_at: datetime = Field(
        ...,
        description="Creation timestamp",
        example="2025-01-01T00:00:00Z",
    )
    updated_at: datetime = Field(
        ...,
        description="Last update timestamp",
        example="2025-01-01T00:00:00Z",
    )
    user_id: str = Field(
        ...,
        description="Identifier of the user owning the conversation",
        example="1234567890123456",
    )


class ErrorResponse(BaseModel):
    """Error response schema."""

    error: str = Field(
        ...,
        description="Error message",
        example="Failed to generate response",
    )
    details: Optional[str] = Field(
        None,
        description="Additional error details",
        example="OpenRouter API rate limit exceeded",
    )
