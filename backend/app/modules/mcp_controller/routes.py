from fastapi import APIRouter, HTTPException, status, Request

from typing import Any, Dict
from uuid import UUID

from core.log_util import logger_instance

# from app.modules.mcp_controller.services.cross_module import MCPControllerService
from app.modules.mcp_controller.schemas import EchoPayload

# Create router
router = APIRouter(prefix="/mcp", tags=["mcp-controller"])


# mcp_controller_service = MCPControllerService()


@router.post("/echo", response_model=EchoPayload)
async def echo_tool(payload: EchoPayload, req: Request) -> EchoPayload:
    """Echo the input text"""
    tmp = req.state.user_id
    logger_instance.info(f"Echoing text: {payload.text} for user: {tmp}")
    return EchoPayload(text=tmp + " : " + payload.text)



# @router.post("/create_page")
# async def create_page(payload: Dict[str, Any], req: Request) -> Dict[str, Any]:
#     """
#     Create a new page with a random ID.

#     This endpoint creates a new page with the provided title and content.
#     The page will be assigned a unique random ID automatically.

#     Args:
#         payload: JSON body containing 'title' and optional 'content'
#         req: FastAPI request object containing authenticated user info

#     Returns:
#         Created page data and success message
#     """
#     try:
#         user_id = req.state.user_id
#         logger_instance.info(
#             f"Creating new page: {payload.get('title')} for user: {user_id}"
#         )

#         # Create the page
#         result = mcp_controller_service.create_page(
#             user_id=user_id,
#             title=payload.get("title"),
#             content=payload.get("content", ""),
#         )

#         # Check if there was an error during creation
#         if "error" in result:
#             logger_instance.error(f"Page creation failed: {result['error']}")
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail=f"Failed to create page: {result['error']}",
#             )

#         page = result.get("page")
#         if hasattr(page, "dict"):
#             page = page.dict()

#         logger_instance.info(
#             f"Successfully created page with ID: {page.get('id') if isinstance(page, dict) else getattr(page, 'id', None)}"
#         )
#         return {"page": page, "message": result["message"]}

#     except HTTPException:
#         raise
#     except Exception as e:
#         logger_instance.error(f"Unexpected error in create_page: {str(e)}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Internal server error: {str(e)}",
#         )



# @router.get("/get_page/{page_id}")
# async def get_page(page_id: str, req: Request) -> Dict[str, Any]:
#     """
#     Retrieve a specific page by its ID.

#     Args:
#         page_id: The unique page identifier
#         req: FastAPI request object containing authenticated user info

#     Returns:
#         Page data if found, 404 if not found
#     """
#     try:
#         user_id = req.state.user_id
#         logger_instance.info(f"Retrieving page with ID: {page_id} for user {user_id}")

#         result = mcp_controller_service.get_page(page_id, user_id=user_id)

#         if result is None:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail=f"Page not found with ID: {page_id}",
#             )

#         if isinstance(result, dict) and "error" in result:
#             logger_instance.error(f"Database error: {result['error']}")
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail=f"Database error: {result['error']}",
#             )

#         logger_instance.info(f"Successfully retrieved page with ID: {page_id}")
#         return {"page": result}

#     except HTTPException:
#         raise
#     except Exception as e:
#         logger_instance.error(f"Unexpected error in get_page: {str(e)}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Internal server error: {str(e)}",
#         )

# @router.get("/get_all_page_titles")
# async def get_all_page_titles(req: Request) -> Dict[str, Any]:
#     try:
#         user_id = req.state.user_id
#         logger_instance.info(f"Retrieving all page titles for user: {user_id}")

#         result = mcp_controller_service.get_all_page_titles(user_id=user_id)

#         if "error" in result:
#             logger_instance.error(f"Failed to retrieve page titles: {result['error']}")
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail=f"Failed to retrieve page titles: {result['error']}",
#             )

#         logger_instance.info(f"Successfully retrieved {result['total_count']} page titles")
#         return result
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger_instance.error(f"Unexpected error in get_all_page_titles: {str(e)}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Internal server error: {str(e)}",
#         )


# @router.post("/get_snippet/{snippet_id}")
# async def get_snippet(snippet_id: str, req: Request) -> Dict[str, Any]:
#     try:
#         user_id = req.state.user_id
#         logger_instance.info(f"Retrieving snippet with ID: {snippet_id} for user {user_id}")

#         result = mcp_controller_service.get_snippet(snippet_id, user_id=user_id)

#         if result is None:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail=f"Snippet not found with ID: {snippet_id}",
#             )

#         if isinstance(result, dict) and "error" in result:
#             logger_instance.error(f"Database error: {result['error']}")
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail=f"Database error: {result['error']}",
#             )

#         logger_instance.info(f"Successfully retrieved snippet with ID: {snippet_id}")
#         return {"snippet": result}
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger_instance.error(f"Unexpected error in get_snippet: {str(e)}")
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Internal server error: {str(e)}",
#         )

