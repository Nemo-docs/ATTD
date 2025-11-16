from fastmcp import FastMCP
import asyncio
from starlette.requests import Request
from starlette.responses import PlainTextResponse
from tools.page_tools import create_page
from core.config import settings
from core.logger import logger


logger.info("Starting MCP server...")


mcp = FastMCP(   name="ATTD MCP server" ,
    instructions="""
        This server provides page management tools.
        Call create_page() to create a new page.
        Call get_all_pages() to retrieve all pages.
        Call get_page_by_id() to retrieve a specific page.
    """,)

# Register authentication middleware globally for all HTTP traffic
# mcp.add_middleware(AuthMiddleware(clerk_client))


# Register tools
mcp.tool(create_page, name="create_page",           
    description="Create a new page with the provided title and optional content for a specific user.", 
    tags={"page", "create"},      
)
# mcp.tool(get_all_pages, name="get_all_pages",           
#     description="Retrieve all pages visible to the specified user.", 
#     tags={"page", "get"},      
# )
# mcp.tool(get_page_by_id, name="get_page_by_id",            
#     description="Retrieve a specific page by its ID for the specified user.", 
#     tags={"page", "get"},      
# )



@mcp.custom_route("/health", methods=["GET"])
async def health_check(request: Request) -> PlainTextResponse:
    return PlainTextResponse("OK")




async def main():
    # Use run_async() in async contexts
    await mcp.run_async(transport="http", port=settings.PORT)

if __name__ == "__main__":
    asyncio.run(main())