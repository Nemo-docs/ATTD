import httpx
from core.config import settings
from clerk_backend_api import Clerk



async def call_backend(ctx, endpoint: str, method: str , data: dict | None = None):
    
    url = f"{settings.BACKEND_BASE_URL}/api{endpoint}"
    # headers = {"Authorization": f"Bearer {ctx.get_state('bearer_token')}"}
    headers = {"Authorization": "Bearer eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zNTlwSU5JUnJ2cWpRMGRNTDFEbk05S25VM3EiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJleHAiOjE3NjUxODM1MjMsImlhdCI6MTc2MjU5MTUyMywiaXNzIjoiaHR0cHM6Ly9oYW5keS11cmNoaW4tMjIuY2xlcmsuYWNjb3VudHMuZGV2IiwianRpIjoiNjI1ZDg0MzY1NmEzNzQwNTg3NGQiLCJuYmYiOjE3NjI1OTE1MTgsInN1YiI6InVzZXJfMzU5cUZ3WFRFcjRSeFZpdzAwenVxMjdmR2h0IiwidXNlcklkIjoidXNlcl8zNTlxRndYVEVyNFJ4Vml3MDB6dXEyN2ZHaHQifQ.GYU_GEqqPy-v0FiB3iSHAf9onIGkLbQkRuW61gOvXlp6mKoyHss_9oaqGYsdWodC1_1Hlm35dXA4cgwlRFG6OqOhqa7Pi8yGMfAa2FASPuYtAIe_NGLBZTR6aE9EwecXa2Bh2owzohkQCaqw0XfCDEuVZxCmCecAfzg2gXDr3yGjhqKvLo-WF1mcMIHmeWvnrOa87SgHJXkjLM0jRr7dQcyGso70J3rbpOxABkx7GVeJZycBedI_PJqJF3FSsM-mvE-Dearx97TVV7Iwy09B6ewwnGVq2ycITXnKF5IVygmd_ikfHF4SlCkCry2S0G9_I2xVeyFbjKZR51kMkHeXHA"}
    
    # Make the request
    async with httpx.AsyncClient() as client:
        response = await client.request(method, url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()





# Initialize Clerk SDK
clerk_client = Clerk(bearer_auth=settings.CLERK_SECRET_KEY)


