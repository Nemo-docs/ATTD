from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from .models import PageModel


class CreatePageRequest(BaseModel):
    """Request schema for creating a new page."""

    title: str = Field(..., description="Page title")
    content: Optional[str] = Field(default="", description="Initial page content")


class CreatePageResponse(BaseModel):
    """Response schema for created page."""

    page: PageModel = Field(description="Created page data")
    message: str = Field(description="Success message")


class UpdatePageRequest(BaseModel):
    """Request schema for updating an existing page."""

    title: Optional[str] = Field(None, description="Page title")
    content: Optional[str] = Field(None, description="Page content")


class UpdatePageResponse(BaseModel):
    """Response schema for updated page."""

    page: PageModel = Field(description="Updated page data")
    message: str = Field(description="Success message")


class GetPagesResponse(BaseModel):
    """Response schema for listing pages."""

    pages: List[PageModel] = Field(description="List of pages")
    total_count: int = Field(description="Total number of pages")


class GetPageResponse(BaseModel):
    """Response schema for retrieving a single page."""

    page: PageModel = Field(description="Page data")


class DeletePageResponse(BaseModel):
    """Response schema for deleted page."""

    message: str = Field(description="Success message")
    deleted_page_id: str = Field(description="ID of deleted page")


class ErrorResponse(BaseModel):
    """Error response schema."""

    error: str = Field(description="Error message")
    details: Optional[str] = Field(None, description="Additional error details")
