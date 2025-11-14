from pydantic import BaseModel, Field
from typing import Optional, List

class EnsureCollectionResponse(BaseModel):
    message: str = Field(description="Success message")

from pydantic import BaseModel, Field
from typing import Optional, List
from .models import SnippetModel, SnippetsModel


class CreateSnippetRequest(BaseModel):
    """Request to create a new snippet."""

    user_id: str = Field(..., min_length=1, description="Owner user identifier")
    content: str = Field(..., description="Snippet content (1-5 lines of text/code)")
    tags: Optional[List[str]] = Field(default_factory=list, description="Optional tags")


class CreateSnippetResponse(BaseModel):
    """Response after creating a snippet."""

    snippet: SnippetModel = Field(description="Created snippet data")
    message: str = Field(description="Success message")


class UpdateSnippetRequest(BaseModel):
    """Request to update snippet content or tags."""

    content: Optional[str] = Field(None, description="Updated snippet content")
    tags: Optional[List[str]] = Field(None, description="Replace tags with this list")
    add_tags: Optional[List[str]] = Field(None, description="Add these tags to the existing tags")


class UpdateSnippetResponse(BaseModel):
    """Response after updating a snippet."""

    snippet: SnippetModel = Field(description="Updated snippet data")
    message: str = Field(description="Success message")


class GetSnippetsResponse(BaseModel):
    """Response for listing snippets."""

    snippets: List[SnippetModel] = Field(description="List of snippets")
    total_count: int = Field(description="Total number of snippets returned")


class GetSnippetResponse(BaseModel):
    """Response for a single snippet retrieval."""

    snippet: SnippetModel = Field(description="Snippet data")


class DeleteSnippetResponse(BaseModel):
    """Response after deleting a snippet."""

    message: str = Field(description="Success message")
    deleted_snippet_id: str = Field(description="ID of deleted snippet")


class ErrorResponse(BaseModel):
    error: str = Field(description="Error message")
    details: Optional[str] = Field(None, description="Optional details about the error")


