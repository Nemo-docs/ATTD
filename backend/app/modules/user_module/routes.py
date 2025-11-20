"""HTTP routes for the user module."""

import re
from fastapi import APIRouter, HTTPException, status
from core.logger import logger_instance
from .schemas import (
    RegisterUserRequest,
    RegisterUserResponse,
    UserResponse,
)
from .services import UserService


router = APIRouter(prefix="/user", tags=["user"])
user_service = UserService()

_USER_ID_PATTERN = re.compile(r"^\d{16}$")


def _validate_user_id(user_id: str) -> None:
    """Ensure the incoming identifier follows the expected format."""

    if not _USER_ID_PATTERN.fullmatch(user_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="user_id must be a 16 digit string",
        )


@router.post("/register", response_model=RegisterUserResponse)
async def register_user(request: RegisterUserRequest) -> RegisterUserResponse:
    """Create the user record if it does not already exist."""

    try:
        user = await user_service.ensure_user(request.user_id)
    except Exception as exc:  # noqa: BLE001 - broad to surface backend errors
        logger_instance.error("Failed to register user %s: %s", request.user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user",
        ) from exc

    return RegisterUserResponse(message="User ready", user=user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str) -> UserResponse:
    """Return the entire user document."""

    _validate_user_id(user_id)

    try:
        user = await user_service.get_user(user_id)
    except Exception as exc:  # noqa: BLE001
        logger_instance.error("Failed to fetch user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user",
        ) from exc

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return UserResponse(user=user)
