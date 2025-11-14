from fastapi import APIRouter, HTTPException
from starlette import status
import logging
import traceback
from .schemas import CreateGitRepoRequest, CreateGitRepoResponse, GetGitRepoResponse, UpdateGitRepoResponse
from .services import GitRepoSetupService
from .management_services import GitRepoManagementService

router = APIRouter()

git_repo_setup_service = GitRepoSetupService()
git_repo_management_service = GitRepoManagementService()

logger = logging.getLogger(__name__)


@router.post("/git-repo/create", response_model=CreateGitRepoResponse)
async def create_git_repo(payload: CreateGitRepoRequest):
    """Accept a GitHub URL, clone it on disk, and return metadata including a repo_hash."""
    try:
        logger.info(f"Creating git repo for URL: {payload.github_url}")
        result = git_repo_setup_service.clone_repo_to_disk(str(payload.github_url))
        logger.info(f"Result: {result}")
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["error"],
            )
        return result
    except Exception as e:
        logger.error(f"Unexpected error in create_git_repo: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/git-repo/{repo_hash}", response_model=GetGitRepoResponse)
async def get_git_repo(repo_hash: str):
    """Retrieve repository metadata by its repo_hash."""
    try:
        logger.info(f"Fetching git repo data for hash: {repo_hash}")
        result = git_repo_setup_service.get_repo_by_hash(repo_hash)
        logger.info(f"Result: {result}")
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=result.get("error")
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_git_repo: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

@router.post("/git-repo-update/", response_model=UpdateGitRepoResponse)
async def update_git_repo(payload: CreateGitRepoRequest):
    """Update repository data by its github_url."""
    try:
        logger.info(f"Updating git repo for URL: {payload.github_url}")
        
        result = git_repo_setup_service.update_repo_by_url(str(payload.github_url))
        
        logger.info(f"{result}")
        return result
    except Exception as e:
        logger.error(f"Unexpected error in update_git_repo: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )