from fastapi import APIRouter, Request, HTTPException, status
from typing import Dict, List, Any

from core.logger import logger_instance

from app.modules.mcp_controller.services.cross_module import MCPControllerService

# Create router
router = APIRouter(prefix="/mcp", tags=["mcp-controller"])


mcp_controller_service = MCPControllerService()


@router.post("/create_page")
def create_page(payload: Dict[str, Any], req: Request) -> Dict[str, Any]:
    """
    Create a new page with a random ID.

    This endpoint creates a new page with the provided title and content.
    The page will be assigned a unique random ID automatically.

    Args:
        payload: JSON body containing 'title' and optional 'content'
        req: FastAPI request object containing authenticated user info

    Returns:
        Created page data and success message
    """
    try:
        user_id = req.state.user_id

        # Create the page
        result = mcp_controller_service.create_page(
            user_id=user_id,
            title=payload.get("title"),
            content=payload.get("content", ""),
        )

        # Check if there was an error during creation
        if "error" in result:
            logger_instance.error(f"Page creation failed: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create page: {result['error']}",
            )

        else:
            page  = result.get("page")
            return page.dict()

    except Exception as e:
        logger_instance.error(f"Unexpected error in create_page: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )



@router.get("/get_page/{page_id}")
def get_page(page_id: str, req: Request) -> Dict[str, Any]:
    """
    Retrieve a specific page by its ID.

    Args:
        page_id: The unique page identifier
        req: FastAPI request object containing authenticated user info

    Returns:
        Page data if found, 404 if not found
    """
    try:
        user_id = req.state.user_id

        result = mcp_controller_service.get_page(page_id, user_id=user_id)

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Page not found with ID: {page_id}",
            )

        return result

    except Exception as e:
        logger_instance.error(f"Unexpected error in get_page: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )

@router.get("/get_all_page_descriptions")
def get_all_page_descriptions(req: Request) -> List[Dict[str, Any]]:
    """
    Retrieve all page descriptions for the authenticated user.

    Args:
        req: FastAPI request object containing authenticated user info

    Returns:
        List of page descriptions and corresponding page id if successful, 500 if error
    """
    try:
        user_id = req.state.user_id

        result = mcp_controller_service.get_all_page_descriptions(user_id=user_id)
        return result
    
    except Exception as e:
        logger_instance.error(f"Unexpected error in getting all page descriptions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get("/get_all_snippets")
def get_all_snippets(req: Request) -> List[Dict[str, Any]]:
    """
    Retrieve all snippets for the authenticated user.

    Args:
        req: FastAPI request object containing authenticated user info

    Returns:
        List of snippets if successful, 500 if error
    """
    try:
        user_id = req.state.user_id

        result = mcp_controller_service.get_all_snippets(user_id=user_id)

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error fetching all snippets",
            )

        return result
    
    except Exception as e:
        logger_instance.error(f"Unexpected error in getting all snippets: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )

