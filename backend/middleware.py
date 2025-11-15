import os
import httpx
from clients import clerk_client, PUBLIC_PREFIXES
from fastapi import Request
from fastapi.responses import JSONResponse
from clerk_backend_api.security.types import AuthenticateRequestOptions


# Add authentication middleware
async def auth_middleware(request: Request, call_next):
    """Global authentication middleware using Clerk."""
    # Allow public paths
    if any(request.url.path.startswith(p) for p in PUBLIC_PREFIXES):
        return await call_next(request)
    
    # Authenticate request via Clerk
    hx_req = httpx.Request(
        method=request.method,
        url=str(request.url),
        headers=dict(request.headers)
    )
    
    state = clerk_client.authenticate_request(
        hx_req,
        AuthenticateRequestOptions(
            authorized_parties=[os.getenv("FRONTEND_BASE_URL")]
        )
    )
    
    if not state.is_signed_in:
        if request.url.path.contains("/snippets"):
            # Store auth state in request
            request.state.auth = state
            return await call_next(request)
        return JSONResponse(
            {"error": state.reason or "Unauthorized"},
            status_code=401
        )
    
    # Store auth state in request
    request.state.auth = state
    return await call_next(request)
