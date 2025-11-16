from typing import Optional, Dict, Any
from core.logger import logger
from core.clients import call_backend
from fastmcp import Context


async def create_page(ctx: Context, title: str, content: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new page with the provided title and optional content for a specific user.

    Endpoint:
        POST /pages/create

    Request Body (JSON):
        - title (str): Required. The page title.
        - content (str | None): Optional. The page content.

    Response (JSON):
        - page (Dict): The created page object. Typical attributes:
            - id (str)
            - user_id (str)
            - title (str)
            - content (str | None)
            - created_at (ISO-8601 string)
            - updated_at (ISO-8601 string)
        - message (str): Informational success message.

    Behavior:
        - Makes a request to create a new page for the user and returns its status as a JSON result.
        - Non-2xx responses will describe the error.
        - Network/transport failures may be described as errors.

    Parameters:
        user_id: Unique identifier of the user who owns the page.
        title: Title of the new page.
        content: Optional content for the page.

    Returns:
        A dictionary parsed from the backend JSON response containing the created page and a message.
    """

    user_id = ctx.get_state("user_id")
    payload: Dict[str] = {"user_id": user_id, "title": title, "content": content}
    
    logger.info(f"Creating page for user: {user_id} with title: {title} and content: {content}")
    response = await call_backend(ctx, "/pages/create", "POST", payload)
    return response


# async def get_all_pages(ctx: Context) -> Dict[str, Any]:
#     """
#     Retrieve all pages visible to the specified user.

#     Endpoint:
#         GET /pages/

#     Response (JSON):
#         - pages (list[Dict]): A list of page objects.
#         - total_count (int): Total number of pages returned.

#     Behavior:
#         - Makes a request to retrieve all pages visible to the specified user and returns its status as a JSON result.
#         - Non-2xx responses will describe the error.
#         - Network/transport failures may be described as errors.

#     Parameters:
#         user_id: Unique identifier of the user for whom pages are requested.

#     Returns:
#         A dictionary containing "pages" and "total_count" keys parsed from the backend JSON response.
#     """
#     user_id = ctx.get_state("user_id")
#     endpoint = f"/pages/?user_id={user_id}"
#     logger.info(f"Retrieving all pages for user: {user_id}")
#     return await call_backend(ctx, endpoint, "GET")


# async def get_page_by_id(ctx: Context, page_id: str) -> Dict[str, Any]:
#     """
#     Retrieve a single page by its ID for the specified user.

#     Endpoint:
#         GET /pages/{page_id}

#     Path Parameters:
#         - page_id (str): Required. The unique identifier of the page to retrieve.

#     Response (JSON):
#         - page (Dict): The requested page object. Typical attributes:
#             - id (str)
#             - user_id (str)
#             - title (str)
#             - content (str | None)
#             - created_at (ISO-8601 string)
#             - updated_at (ISO-8601 string)

#     Behavior:
#         - Makes a request to retrieve a single page by its ID for the specified user and returns its status as a JSON result.
#         - If the page is not found, the backend returns HTTP 404 which triggers an error.
#         - Network/transport failures may be described as errors.

#     Parameters:
#         page_id: The unique page identifier.
#         user_id: The unique user identifier used for access scoping.

#     Returns:
#         A dictionary parsed from the backend JSON response containing the requested page.
#     """

#     user_id = ctx.get_state("user_id")
#     endpoint = f"/pages/{page_id}"
#     logger.info(f"Retrieving page by ID: {page_id} for user: {user_id}")
#     return await call_backend(ctx, endpoint, "GET")
