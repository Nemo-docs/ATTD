# from openai import OpenAI
from langfuse.openai import openai
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from clerk_backend_api import Clerk
from core.config import settings


open_router_client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
)


mongodb_client = MongoClient(settings.MONGODB_URI, server_api=ServerApi("1"))




# Initialize Clerk SDK
clerk_client = Clerk(bearer_auth=settings.CLERK_SECRET_KEY)