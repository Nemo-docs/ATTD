from fastapi import APIRouter, HTTPException, status
from typing import Dict, List
import logging

from .service import PageManagementService
from .schema import (
    CreatePageRequest,
    CreatePageResponse,
    UpdatePageRequest,
    UpdatePageResponse,
    GetPagesResponse,
    GetPageResponse,
    DeletePageResponse,
    ErrorResponse,
)

# Create router
router = APIRouter(prefix="/pages", tags=["page-management"])

# Initialize service
page_service = PageManagementService()
logger = logging.getLogger(__name__)


@router.post("/create", response_model=CreatePageResponse)
async def create_page(
    request: CreatePageRequest,
) -> CreatePageResponse:
    """
    Create a new page with a random ID.

    This endpoint creates a new page with the provided title and content.
    The page will be assigned a unique random ID automatically.

    Args:
        request: Page creation request containing title and optional content

    Returns:
        Created page data and success message
    """
    try:
        logger.info(f"Creating new page: {request.title}")

        # Create the page
        result = page_service.create_page(
            user_id=request.user_id, title=request.title, content=request.content
        )

        # Check if there was an error during creation
        if "error" in result:
            logger.error(f"Page creation failed: {result['error']}")
            status_code_value = (
                status.HTTP_400_BAD_REQUEST
                if result["error"] == "user_id is required"
                else status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            raise HTTPException(
                status_code=status_code_value,
                detail=f"Failed to create page: {result['error']}",
            )

        logger.info(f"Successfully created page with ID: {result['page'].id}")
        return CreatePageResponse(page=result["page"], message=result["message"])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in create_page: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get("/", response_model=GetPagesResponse)
async def get_all_pages(user_id: str) -> GetPagesResponse:
    """
    Retrieve all pages in the system.

    Returns:
        List of all pages and total count
    """
    try:
        logger.info(f"Retrieving all pages for user: {user_id}")

        result = page_service.get_all_pages(user_id=user_id)

        if "error" in result:
            logger.error(f"Failed to retrieve pages: {result['error']}")
            status_code_value = (
                status.HTTP_400_BAD_REQUEST
                if result["error"] == "user_id is required"
                else status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            raise HTTPException(
                status_code=status_code_value,
                detail=f"Failed to retrieve pages: {result['error']}",
            )

        logger.info(f"Successfully retrieved {result['total_count']} pages")
        return GetPagesResponse(
            pages=result["pages"], total_count=result["total_count"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_all_pages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get("/{page_id}", response_model=GetPageResponse)
async def get_page(page_id: str, user_id: str) -> GetPageResponse:
    """
    Retrieve a specific page by its ID.

    Args:
        page_id: The unique page identifier

    Returns:
        Page data if found, 404 if not found
    """
    try:
        logger.info(f"Retrieving page with ID: {page_id} for user {user_id}")

        result = page_service.get_page(page_id, user_id=user_id)

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Page not found with ID: {page_id}",
            )

        if "error" in result:
            logger.error(f"Database error: {result['error']}")
            status_code_value = (
                status.HTTP_400_BAD_REQUEST
                if result["error"] == "user_id is required"
                else status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            raise HTTPException(
                status_code=status_code_value,
                detail=f"Database error: {result['error']}",
            )

        # Convert to PageModel for consistent response format
        from .models import PageModel

        page_model = PageModel(**result)

        logger.info(f"Successfully retrieved page with ID: {page_id}")
        return GetPageResponse(page=page_model)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_page: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.put("/{page_id}", response_model=UpdatePageResponse)
async def update_page(
    page_id: str,
    user_id: str,
    request: UpdatePageRequest,
) -> UpdatePageResponse:
    """
    Update a page's title and/or content.

    Args:
        page_id: The unique page identifier
        request: Page update request containing optional title and content

    Returns:
        Updated page data and success message
    """
    try:
        logger.info(f"Updating page with ID: {page_id} for user {user_id}")

        # Update the page
        result = page_service.update_page(
            page_id=page_id,
            user_id=user_id,
            title=request.title,
            content=request.content,
        )

        # Check if there was an error during update
        if "error" in result:
            if "not found" in result["error"].lower():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=result["error"],
                )
            else:
                logger.error(f"Page update failed: {result['error']}")
                status_code_value = (
                    status.HTTP_400_BAD_REQUEST
                    if result["error"] == "user_id is required"
                    else status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                raise HTTPException(
                    status_code=status_code_value,
                    detail=f"Failed to update page: {result['error']}",
                )

        logger.info(f"Successfully updated page with ID: {page_id}")
        return UpdatePageResponse(page=result["page"], message=result["message"])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in update_page: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.delete("/{page_id}", response_model=DeletePageResponse)
async def delete_page(page_id: str, user_id: str) -> DeletePageResponse:
    """
    Delete a page by its ID.

    Args:
        page_id: The unique page identifier

    Returns:
        Success message with deleted page ID
    """
    try:
        logger.info(f"Deleting page with ID: {page_id} for user {user_id}")

        # Delete the page
        result = page_service.delete_page(page_id, user_id=user_id)

        # Check if there was an error during deletion
        if "error" in result:
            if "not found" in result["error"].lower():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=result["error"],
                )
            else:
                logger.error(f"Page deletion failed: {result['error']}")
                status_code_value = (
                    status.HTTP_400_BAD_REQUEST
                    if result["error"] == "user_id is required"
                    else status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                raise HTTPException(
                    status_code=status_code_value,
                    detail=f"Failed to delete page: {result['error']}",
                )

        logger.info(f"Successfully deleted page with ID: {page_id}")
        return DeletePageResponse(
            message=result["message"], deleted_page_id=result["deleted_page_id"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in delete_page: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )
