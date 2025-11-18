from typing import Optional, Dict, List, Any 
from core.logger import logger
from core.clients import call_backend
from fastmcp import Context


async def create_page(ctx: Context, title: str, content: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new page with the provided title and optional content for a specific user.

    Endpoint:
        POST /create_page

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
        title: Title of the new page.
        content: Optional content for the page.

    Returns:
        A dictionary parsed from the backend JSON response containing the created page and a message.
    """
    payload: Dict[str, Any] = {"title": title, "content": content if content is not None else ""}
    endpoint = "/create_page"
    logger.info(f"Creating page with title: {title} and content: {content}")
    response = await call_backend(ctx, endpoint, "POST", payload)
    return response


async def get_all_page_descriptions(ctx: Context) -> List[Dict[str, Any]]:
    """
    Retrieve all pages visible to the specified user.

    Endpoint:
        GET /get_all_page_descriptions

    Response (JSON):
        - list[Dict]: A list of page objects. each page contains id and title
            - id (str): The unique identifier of the page.
            - title (str): The title of the page.

    Behavior:
        - Makes a request to retrieve all pages visible to the specified user and returns its status as a JSON result.
        - Non-2xx responses will describe the error.
        - Network/transport failures may be described as errors.

    Returns:
        List of page descriptions and corresponding page id if successful, 500 if error
    """
    endpoint = "/get_all_page_descriptions"
    logger.info("Retrieving all page descriptions")
    response = await call_backend(ctx, endpoint, "GET")
    return response


async def get_page_by_id(ctx: Context, page_id: str) -> Dict[str, Any]:
    """
    Retrieve a single page by its ID for the specified user.

    Endpoint:
        GET /get_page/{page_id}

    Path Parameters:
        - page_id (str): Required. The unique identifier of the page to retrieve.

    Response (JSON):
        - page (Dict): The requested page object. Typical attributes:
            - id (str)
            - user_id (str)
            - title (str)
            - content (str | None)
            - created_at (ISO-8601 string)
            - updated_at (ISO-8601 string)

    Behavior:
        - Makes a request to retrieve a single page by its ID for the specified user and returns its status as a JSON result.
        - If the page is not found, the backend returns HTTP 404 which triggers an error.
        - Network/transport failures may be described as errors.

    Parameters:
        page_id: The unique page identifier.

    Returns:
        A dictionary parsed from the backend JSON response containing the requested page.
    """

    endpoint = f"/get_page/{page_id}"
    logger.info(f"Retrieving page by ID: {page_id}")
    response = await call_backend(ctx, endpoint, "GET")
    return response
 

async def get_all_snippets(ctx: Context) -> List[Dict[str, Any]]:
    """
    Retrieve all snippets for the authenticated user.

    Endpoint:
        GET /get_all_snippets

    Returns:
        List of snippet objects
    """
    endpoint = "/get_all_snippets"
    logger.info("Retrieving all snippets")
    response = await call_backend(ctx, endpoint, "GET")
    return response

