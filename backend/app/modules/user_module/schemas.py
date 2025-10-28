"""Request and response schemas for the user module."""

from datetime import datetime

from pydantic import BaseModel, Field

from .models import UserModel


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
