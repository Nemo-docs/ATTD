
from typing import List, Optional

from pydantic import BaseModel, Field

from .models import SnippetModel


class EnsureCollectionResponse(BaseModel):
    message: str = Field(description="Success message")


class CreateSnippetRequest(BaseModel):
    """Request to create a new snippet."""

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


class LocalSnippetPayload(BaseModel):
    """Representation of a local snippet payload coming from desktop client storage."""

    id: str = Field(..., description="Client-side snippet identifier")
    user_id: Optional[str] = Field(None, description="Owner user identifier")
    content: str = Field(..., description="Snippet content to sync")
    tags: List[str] = Field(default_factory=list, description="Optional tags from the client")
    created_at: Optional[str] = Field(None, description="Client-side creation timestamp")
    updated_at: Optional[str] = Field(None, description="Client-side updated timestamp")
    last_edit_unix: Optional[int] = Field(
        None, description="Client-side unix timestamp used for diffing"
    )


class SyncSnippetsRequest(BaseModel):
    """Request to synchronize local snippets with the server."""

    last_edit_unix: Optional[int] = Field(
        None, description="Client-side last edit unix timestamp"
    )
    snippets: List[LocalSnippetPayload] = Field(
        default_factory=list, description="Local snippets snapshot"
    )


class SyncSnippetsResponse(BaseModel):
    """Response returned after merging snippets."""

    message: str = Field(description="Sync operation status")
    snippets: List[SnippetModel] = Field(description="Merged snippets list")
    last_unix_timestamp: int = Field(description="Server-side last edit unix timestamp")
    was_changed: bool = Field(description="Indicates whether server data changed")


class SyncStatusResponse(BaseModel):
    """Response describing the server sync state."""

    last_unix_timestamp: int = Field(description="Server's last edit unix timestamp")
    total_count: int = Field(description="Number of snippets stored for the user")


