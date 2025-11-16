from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import Dict, List
from core.log_util import logger_instance
import json
from app.modules.auto_generation.service import AutoGenerationService
from app.modules.auto_generation.schema import (
    GenerateIntroRequest,
    GenerateIntroResponse,
)
from app.modules.auto_generation.service_definations import ParseDefinitionsService
from app.modules.auto_generation.models import Definition

# Create router
router = APIRouter(prefix="/auto-generation", tags=["auto-generation"])

# Initialize service
auto_gen_service = AutoGenerationService()


@router.post("/generate-intro", response_model=GenerateIntroResponse)
async def generate_project_intro(
    request: GenerateIntroRequest,
) -> GenerateIntroResponse:
    """
    Generate project introduction, data flow diagram, and cursory explanation for a repository.

    This endpoint analyzes the given repository path and generates:
    - A comprehensive project introduction
    - A Mermaid data flow diagram
    - A cursory explanation of all code files with their roles

    The results are automatically saved to the database for future retrieval.
    """
    try:
        logger_instance.info(f"Generating intro for repository: {request.repo_path}")

        # Generate the project intro
        result = auto_gen_service.generate_intro(request.repo_path)

        # Check if there was an error during generation
        if "error" in result:
            logger_instance.error(f"Generation failed: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate project intro: {result['error']}",
            )

        # Convert to response model
        response = GenerateIntroResponse(
            repo_path=result["repo_path"],
            repo_hash=result["repo_hash"],
            project_intro=result["project_intro"],
            project_data_flow_diagram=result["project_data_flow_diagram"],
            project_cursory_explanation=result["project_cursory_explanation"],
        )

        logger_instance.info(f"Successfully generated intro for repository: {request.repo_path}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger_instance.error(f"Unexpected error in generate_project_intro: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get("/project/{repo_hash}")
async def get_project_intro(repo_hash: str) -> Dict:
    """
    Retrieve project introduction by repository hash.

    Args:
        repo_hash: The SHA-256 hash of the repository path

    Returns:
        Project intro data if found, 404 if not found
    """
    try:
        logger_instance.info(f"Retrieving project intro for hash: {repo_hash}")

        result = auto_gen_service.get_project_intro_by_hash(repo_hash)

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project intro not found for hash: {repo_hash}",
            )

        if "error" in result:
            logger_instance.error(f"Database error: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {result['error']}",
            )

        logger_instance.info(f"Successfully retrieved project intro for hash: {repo_hash}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger_instance.error(f"Unexpected error in get_project_intro: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get("/project")
async def get_project_intro_by_path(repo_path: str) -> Dict:
    """
    Retrieve project introduction by repository path.

    Args:
        repo_path: The path to the repository

    Returns:
        Project intro data if found, 404 if not found
    """
    try:
        logger_instance.info(f"Retrieving project intro for path: {repo_path}")

        result = auto_gen_service.get_project_intro(repo_path)

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project intro not found for path: {repo_path}",
            )

        if "error" in result:
            logger_instance.error(f"Database error: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {result['error']}",
            )

        logger_instance.info(f"Successfully retrieved project intro for path: {repo_path}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger_instance.error(f"Unexpected error in get_project_intro_by_path: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.delete("/project")
async def delete_project_intro(repo_path: str) -> Dict:
    """
    Delete project introduction by repository path.

    Args:
        repo_path: The path to the repository

    Returns:
        Success message
    """
    try:
        logger_instance.info(f"Deleting project intro for path: {repo_path}")

        success = auto_gen_service.delete_project_intro(repo_path)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project intro not found for path: {repo_path}",
            )

        logger_instance.info(f"Successfully deleted project intro for path: {repo_path}")
        return {
            "message": f"Project intro deleted successfully for path: {repo_path}",
            "deleted": True,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger_instance.error(f"Unexpected error in delete_project_intro: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.delete("/project/{repo_hash}")
async def delete_project_intro_by_hash(repo_hash: str) -> Dict:
    """
    Delete project introduction by repository hash.

    Args:
        repo_hash: The SHA-256 hash of the repository path

    Returns:
        Success message
    """
    try:
        logger_instance.info(f"Deleting project intro for hash: {repo_hash}")

        # Use the service's database operations
        success = auto_gen_service._delete_project_intro(repo_hash)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project intro not found for hash: {repo_hash}",
            )

        logger_instance.info(f"Successfully deleted project intro for hash: {repo_hash}")
        return {
            "message": f"Project intro deleted successfully for hash: {repo_hash}",
            "deleted": True,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger_instance.error(f"Unexpected error in delete_project_intro_by_hash: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )

@router.get("/definitions/{repo_hash}")
async def get_definitions(repo_hash: str, req: Request, parse_definitions: ParseDefinitionsService = Depends(ParseDefinitionsService)) -> List[Dict]:
    try:
        definitions = parse_definitions.get_all_node_short_info(repo_hash)
        return definitions
    except Exception as e:
        logger_instance.error(f"Unexpected error in get_definitions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )