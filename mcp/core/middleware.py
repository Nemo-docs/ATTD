import httpx
from fastmcp.server.middleware import Middleware, MiddlewareContext
from fastmcp.server.dependencies import get_http_headers
# from starlette.responses import JSONResponse
from clerk_backend_api.security.types import AuthenticateRequestOptions
from core.logger import logger
from core.config import settings

# Define public paths that bypass authentication
PUBLIC_PREFIXES = ("/health",)

class AuthMiddleware(Middleware):
    def __init__(self, clerk_client):
        self.clerk = clerk_client
    
    async def on_request(self, context: MiddlewareContext, call_next):

        """
        Global authentication middleware using Clerk.
        
        Validates requests by:
        - Requiring Authorization header with valid Clerk token
        - Requiring X-User-Id header presence
        - Bypassing validation for public paths
        """

        # Allow initialize method to bypass authentication
        if context.method == "initialize":
            return await call_next(context)

        headers = get_http_headers(include_all=True)
        auth_header = headers.get("Authorization") or headers.get("authorization")
        user_id_header = headers.get("X-User-ID") or headers.get("x-user-id")

        if not auth_header or not user_id_header:
            raise ValueError("Authentication failed: missing Authorization or X-User-ID header")

        if not auth_header.lower().startswith("bearer "):
            raise ValueError("Authentication failed: invalid bearer token scheme")

        
        # Authenticate request via Clerk using only Authorization header
        token = auth_header.split(" ", 1)[1].strip()
        hx_req = httpx.Request(
            method="GET",
            url=settings.BACKEND_BASE_URL,
            headers={"Authorization": "Bearer " + token},
        )

        state = self.clerk.authenticate_request(hx_req, AuthenticateRequestOptions(
            authorized_parties=[settings.FRONTEND_BASE_URL]
        ))

        if not state.is_signed_in:
            raise ValueError(f"Authentication failed: {state.reason}")

        
        token_user_id = state.payload["userId"]
        logger.info(f"Clerk user: {token_user_id}")

        # set state so tools can access user_id
        if context.fastmcp_context:
            context.fastmcp_context.set_state("bearer_token", auth_header)
            context.fastmcp_context.set_state("user_id", user_id_header)


        return await call_next(context)
