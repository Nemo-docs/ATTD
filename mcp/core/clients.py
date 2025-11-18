import httpx
from core.config import settings


async def call_backend(ctx, endpoint: str, method: str , data: dict | None = None):
    
    url = f"{settings.BACKEND_BASE_URL}/api/mcp{endpoint}"
    headers =  {"X-Api-Key": f"{ctx.get_state('api_key')}"}
        
    # Make the request
    async with httpx.AsyncClient() as client:
        response = await client.request(method, url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()
