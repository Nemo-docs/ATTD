from pydantic import BaseModel, Field
from typing import Optional, Union, Literal
from datetime import datetime
from app.modules.auto_generation.models import ApplicationModel, LibraryModel, ServiceModel


class GenerateIntroRequest(BaseModel):
    """Request schema for generating project introduction."""

    github_url: str = Field(..., description="The GitHub URL of the project repository")
    repo_hash: str = Field(..., description="The hash of the project repository")
    name: str = Field(..., description="The name of the project")


class GenerateIntroResponse(BaseModel):
    """Response schema for generated project introduction."""

    repo_path: str = Field(description="The path to the project repository")
    repo_hash: str = Field(description="The hash of the project repository")
    repo_type: Literal["application", "library", "service"] = Field(description="The type of the repository")
    repo_info: Union[ApplicationModel, LibraryModel, ServiceModel] = Field(description="Detailed information about the repository based on its type")
    github_url: str = Field(description="The GitHub URL of the project")
    name: str = Field(description="The name of the project")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class ErrorResponse(BaseModel):
    """Error response schema."""

    error: str = Field(description="Error message")
    details: Optional[str] = Field(None, description="Additional error details")
