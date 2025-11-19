# from openai import OpenAI
from langfuse.openai import openai
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from clerk_backend_api import Clerk
import redis.asyncio as aioredis
from core.config import settings

# Initialize OpenRouter Client
open_router_client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
)

# Initiallize MongoDB Client 
mongodb_client = MongoClient(settings.MONGODB_URI, server_api=ServerApi("1"))


# Initialize Clerk SDK
clerk_client = Clerk(bearer_auth=settings.CLERK_SECRET_KEY)


# Initialize Redis Client
redis_client = aioredis.Redis.from_url(url=settings.REDIS_URL, decode_responses=True)
