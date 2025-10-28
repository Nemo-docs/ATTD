from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class GenerateIntroRequest(BaseModel):
    """Request schema for generating project introduction."""

    repo_path: str = Field(..., description="The path to the project repository")


class GenerateIntroResponse(BaseModel):
    """Response schema for generated project introduction."""

    repo_path: str = Field(description="The path to the project repository")
    repo_hash: str = Field(description="The hash of the project repository")
    project_intro: str = Field(description="The introduction of the project")
    project_data_flow_diagram: str = Field(
        description="The data flow diagram of the project"
    )
    project_cursory_explanation: str = Field(
        description="The cursory explanation of the project"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Creation timestamp"
    )


class ErrorResponse(BaseModel):
    """Error response schema."""

    error: str = Field(description="Error message")
    details: Optional[str] = Field(None, description="Additional error details")
