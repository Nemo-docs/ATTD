from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class InlineQnaRequest(BaseModel):
    """Request schema for inline Q&A functionality."""

    text: str = Field(
        ...,
        description="The user's query text",
        example="What is the capital of France?",
    )
    cursor_position: dict = Field(
        ...,
        description="The position of the cursor in the text",
        example={"x": 100, "y": 200},
    )
    page_id: str = Field(
        ...,
        description="The ID of the page where the query originated",
        example="1234567890",
    )


class InlineQnaResponse(BaseModel):
    """Response schema for inline Q&A functionality."""

    text: str = Field(
        ...,
        description="The user's query text",
        example="What is the capital of France?",
    )
    cursor_position: dict = Field(
        ...,
        description="The position of the cursor in the text",
        example={"x": 100, "y": 200},
    )
    page_id: str = Field(
        ...,
        description="The ID of the page where the query originated",
        example="1234567890",
    )
    answer: str = Field(
        ...,
        description="The AI-generated answer to the query",
        example="The capital of France is Paris.",
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Creation timestamp",
        example="2025-01-01T00:00:00Z",
    )


class ErrorResponse(BaseModel):
    """Error response schema."""

    error: str = Field(
        ...,
        description="Error message",
        example="Failed to generate answer",
    )
    details: Optional[str] = Field(
        None,
        description="Additional error details",
        example="Failed to generate answer",
    )
