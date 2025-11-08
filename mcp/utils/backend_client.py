import httpx
from utils.config import ENV




async def call_backend(ctx, endpoint: str, method: str , data: dict | None = None):
    
    url = f"{ENV.BACKEND_BASE_URL}/api{endpoint}"
    headers = {"Authorization": f"Bearer {ctx.get_state('bearer_token')}"}
    
    
    # Make the request
    async with httpx.AsyncClient() as client:
        response = await client.request(method, url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()
