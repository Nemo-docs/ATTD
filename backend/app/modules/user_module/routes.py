"""HTTP routes for the user module."""

import re
from fastapi import APIRouter, HTTPException, status, Request
from core.logger import logger_instance
from .schemas import (
    AddRepoInfoRequest,
    AddRepoInfoResponse,
    GetUserAddedRepoInfosResponse,
    RemoveRepoInfoRequest,
    RemoveRepoInfoResponse,
)
from .services import UserService


router = APIRouter(prefix="/user", tags=["user"])
user_service = UserService()

# _USER_ID_PATTERN = re.compile(r"^\d{16}$")


# def _validate_user_id(user_id: str) -> None:
#     """Ensure the incoming identifier follows the expected format."""

#     if not _USER_ID_PATTERN.fullmatch(user_id):
#         raise HTTPException(
#             status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
#             detail="user_id must be a 16 digit string",
#         )


# @router.post("/register", response_model=RegisterUserResponse)
# async def register_user(request: RegisterUserRequest) -> RegisterUserResponse:
#     """Create the user record if it does not already exist."""

#     try:
#         user = await user_service.ensure_user(request.user_id)
#     except Exception as exc:  # noqa: BLE001 - broad to surface backend errors
#         logger_instance.error("Failed to register user %s: %s", request.user_id, exc)
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="Failed to register user",
#         ) from exc

#     return RegisterUserResponse(message="User ready", user=user)


@router.post("/add-repo-info", response_model=AddRepoInfoResponse)
async def add_repo_info(request: AddRepoInfoRequest, req: Request) -> AddRepoInfoResponse:
    """Add repository information to the user's record."""
    try:
        user_id = req.state.user_id
        completed = await user_service.add_repo_info(
            user_id, 
            request.repo_hash, 
            request.repo_name, 
            request.repo_url
        )
        if not completed:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add repository information",
            )
    except Exception as exc:  # noqa: BLE001 - broad to surface backend errors
        logger_instance.error("Failed to add repository information to user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add repository information",
        ) from exc
    return AddRepoInfoResponse(completed=True)


@router.get("/get-user-added-repo-infos", response_model=GetUserAddedRepoInfosResponse)
async def get_user_added_repo_infos(request: Request) -> GetUserAddedRepoInfosResponse:
    """Get repository information for a user."""
    try:
        repo_infos = await user_service.get_user_added_repo_infos(request.state.user_id)
        if repo_infos is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No repository information found for user",
            )
    except Exception as exc:  # noqa: BLE001 - broad to surface backend errors
        logger_instance.error("Failed to get repository information for user %s: %s", request.state.user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get repository information",
        ) from exc
    return GetUserAddedRepoInfosResponse(repo_infos=repo_infos if repo_infos else [])


@router.post("/remove-repo-info", response_model=RemoveRepoInfoResponse)
async def remove_repo_info_endpoint(request: RemoveRepoInfoRequest, req: Request) -> RemoveRepoInfoResponse:
    """Remove repository information from the user's record."""
    try:
        user_id = req.state.user_id
        completed = await user_service.remove_repo_info(user_id, request.repo_hash)
        if not completed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Repository not found in user's repos",
            )
    except Exception as exc:  # noqa: BLE001 - broad to surface backend errors
        logger_instance.error("Failed to remove repository information for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove repository information",
        ) from exc
    return RemoveRepoInfoResponse(completed=True)