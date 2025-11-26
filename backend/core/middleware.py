import httpx
from core.config import settings
from core.clients import clerk_client
from fastapi import Request
from fastapi.responses import JSONResponse
from clerk_backend_api.security.types import AuthenticateRequestOptions
from utils.auth_redis import get_key_context
from core.logger import logger_instance
# Define public paths that bypass authentication
PUBLIC_PREFIXES = ("/health", "/metrics", "/docs", "/openapi.json") # Allowed all but restrict access when routes are updated for auth



# Add authentication middleware
async def auth_middleware(request: Request, call_next):
    """Global authentication middleware using Clerk."""
    # Allow public paths
    if any(request.url.path.startswith(p) for p in PUBLIC_PREFIXES):
        return await call_next(request)

    # Bypass auth for OPTIONS preflight requests
    if request.method == "OPTIONS":
        return await call_next(request)

    # API key auth for MCP endpoints
    if request.url.path.startswith("/api/mcp"):
        raw_key = request.headers.get("X-Api-Key") or request.headers.get("x-api-key")
        if not raw_key:
            return JSONResponse(
                {"error": "Missing API key"},
                status_code=401
            )
        
        user_id_res = await get_key_context(raw_key)
        if isinstance(user_id_res, JSONResponse):
            return user_id_res
        
        request.state.user_id = user_id_res
        return await call_next(request)
    
    # API auth for notepad requests
    if request.url.path.startswith("/api/snippets") and request.headers.get("x-Api-Key"):
        try:
            raw_key = request.headers.get("x-Api-Key")
            user_id_res = await get_key_context(raw_key)
            if isinstance(user_id_res, JSONResponse):
                return user_id_res
            
            if user_id_res:
                request.state.user_id = user_id_res
                return await call_next(request)
        except Exception as e:
            return JSONResponse(
                {"error": "Invalid API key"},
                status_code=401
            )
        return JSONResponse(
                {"error": "Invalid API key"},
                status_code=401
            )        
    
    # Authenticate request via Clerk
    hx_req = httpx.Request(
        method=request.method,
        url=str(request.url),
        headers=dict(request.headers)
    )

    auth_parties = [settings.FRONTEND_BASE_URL]
    # if "/api/snippets" in request.url.path:
    #     auth_parties.append("*")

    state = clerk_client.authenticate_request(
        hx_req,
        AuthenticateRequestOptions(
            authorized_parties=auth_parties
        )
    )
    
    if not state.is_signed_in:
        reason = state.reason.value if hasattr(state.reason, "value") else str(state.reason)
        return JSONResponse(
            {"error": reason or "Unauthorized"},
            status_code=401
        )
    
    # Store auth state and user_id in request
    request.state.auth = state
    request.state.user_id = state.payload.get('sub')
    return await call_next(request)
