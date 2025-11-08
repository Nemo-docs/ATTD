from fastmcp import FastMCP
from starlette.requests import Request
from utils.middleware import AuthMiddleware
from utils.clerk_client import clerk_client
from tools.page_tools import create_page, get_all_pages, get_page_by_id
from utils.config import ENV


mcp = FastMCP(   name="ATTD MCP server" ,
    instructions="""
        This server provides page management tools.
        Call create_page() to create a new page.
        Call get_all_pages() to retrieve all pages.
        Call get_page_by_id() to retrieve a specific page.
    """,)

# Register authentication middleware globally for all HTTP traffic
mcp.add_middleware(AuthMiddleware(clerk_client))


# Register tools
mcp.tool(create_page, name="create_page",           
    description="Create a new page with the provided title and optional content for a specific user.", 
    tags={"page", "create"},      
)
mcp.tool(get_all_pages, name="get_all_pages",           
    description="Retrieve all pages visible to the specified user.", 
    tags={"page", "get"},      
)
mcp.tool(get_page_by_id, name="get_page_by_id",            
    description="Retrieve a specific page by its ID for the specified user.", 
    tags={"page", "get"},      
)



@mcp.custom_route("/health", methods=["GET"])
async def health_check(request: Request):
    return {"status": "ok"}




if __name__ == "__main__":
    mcp.run(transport="streamable-http", port=ENV.PORT)
