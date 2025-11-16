import os
import httpx
from clients import clerk_client, PUBLIC_PREFIXES
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from clerk_backend_api.security.types import AuthenticateRequestOptions


# Add authentication middleware
async def auth_middleware(request: Request, call_next):
    """Global authentication middleware using Clerk."""
    # Allow public paths
    if any(request.url.path.startswith(p) for p in PUBLIC_PREFIXES):
        return await call_next(request)

    if request.method == "OPTIONS":
        return await call_next(request)
    
    # Authenticate request via Clerk
    hx_req = httpx.Request(
        method=request.method,
        url=str(request.url),
        headers=dict(request.headers)
    )

    auth_parties = [os.getenv("FRONTEND_BASE_URL")]
    if "/api/snippets" in request.url.path:
        auth_parties.append("*")

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
