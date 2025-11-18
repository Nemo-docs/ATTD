from fastmcp.server.middleware import Middleware, MiddlewareContext
from fastmcp.server.dependencies import get_http_headers, get_http_request

# Define public paths that bypass authentication
PUBLIC_PREFIXES = ("/health",)




class AuthMiddleware(Middleware):
    def __init__(self):
        pass
    
    async def on_request(self, context: MiddlewareContext, call_next):

        """
        Global authentication middleware using API Key.
        
        Validates requests by:
        - Requiring X-Api-Key header presence
        - Bypassing validation for public paths
        """

        # Allow initialize method to bypass authentication
        if context.method == "initialize":
            return await call_next(context)

        # Bypass authentication for public prefixes
        try:
            request = get_http_request()
            path = request.url.path if request else ""
        except Exception:
            path = ""
        if any(path.startswith(prefix) for prefix in PUBLIC_PREFIXES):
            return await call_next(context)

        headers = get_http_headers(include_all=True)
        api_key_header = headers.get("X-Api-Key") or headers.get("x-api-key")

        if not api_key_header:
            raise ValueError("Unauthorized 401: Missing API key")

        # set state so tools can access user_id
        if context.fastmcp_context:
            context.fastmcp_context.set_state("api_key", api_key_header)


        return await call_next(context)   
