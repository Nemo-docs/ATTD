"""Request and response schemas for the user module."""

from datetime import datetime
from typing_extensions import List
from pydantic import BaseModel, Field

from .models import UserModel, RepoInfoModel


class RegisterUserRequest(BaseModel):
    """Payload required to register or ensure a user record."""

    user_id: str = Field(
        ...,
        min_length=16,
        max_length=16,
        description="16 digit identifier",
    )


class RegisterUserResponse(BaseModel):
    """Response returned after ensuring a user exists."""

    message: str = Field(..., description="Operation summary message")
    user: UserModel = Field(..., description="The ensured user model")


class UserResponse(BaseModel):
    """Response wrapper for a user model."""

    user: UserModel = Field(..., description="User record")


class UserDataResponse(BaseModel):
    """Response containing the persisted user data."""

    user_id: str = Field(..., description="User identifier")
    updated_at: datetime = Field(..., description="Last update timestamp")

class AddRepoInfoRequest(BaseModel):
    """Payload required to add repository information to the user's record."""

    repo_hash: str = Field(..., description="Repository hash")
    repo_name: str = Field(..., description="Repository name")
    repo_url: str = Field(..., description="Repository URL")


class AddRepoInfoResponse(BaseModel):
    """Response returned after adding repository information to the user's record."""
    completed: bool = Field(..., description="Whether the operation completed successfully")

class GetUserAddedRepoInfosResponse(BaseModel):
    """Response returned after getting repository information for a user."""
    repo_infos: List[RepoInfoModel] = Field(..., description="List of repository information")


class RemoveRepoInfoRequest(BaseModel):
    """Payload required to remove repository information from the user's record."""

    repo_hash: str = Field(..., description="Repository hash")


class RemoveRepoInfoResponse(BaseModel):
    """Response returned after removing repository information from the user's record."""
    completed: bool = Field(..., description="Whether the operation completed successfully")