from openai import OpenAI
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

load_dotenv()

open_router_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)


# response = open_router_client.chat.completions.create(
#     model="minimax/minimax-m2:free",
#     messages=[{"role": "user", "content": "What is the meaning of life?"}],
# )
# print(response.choices[0].message.content)

mongodb_client = MongoClient(os.getenv("MONGODB_URI"), server_api=ServerApi("1"))


# from pymongo.mongo_client import MongoClient
# from pymongo.server_api import ServerApi

# uri = os.getenv("MONGODB_URI")

# # Create a new client and connect to the server
# client = MongoClient(uri, server_api=ServerApi("1"))

# # Send a ping to confirm a successful connection
# try:
#     client.admin.command("ping")
#     print("Pinged your deployment. You successfully connected to MongoDB!")
# except Exception as e:
#     print(e)
