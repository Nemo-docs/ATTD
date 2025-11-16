import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import ValidationError

from dotenv import load_dotenv

# Load .env into process environment so non-Settings code can access env vars for LANGFUSE_PUBLIC_KEY
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=ENV_PATH)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "..", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    BACKEND_BASE_URL: str
    FRONTEND_BASE_URL: str
    CLERK_SECRET_KEY: str
    PORT: int
    LOG_LEVEL: str
    

try:
    settings = Settings()
    
# If any required environment variables are missing, raise a ValueError
except ValidationError as e:
    missing = [
        str(err.get("loc")[-1] if isinstance(err.get("loc"), (list, tuple)) else err.get("loc"))
        for err in e.errors()
        if err.get("msg") == "Field required"
    ]
    if missing:
        raise ValueError(
            f"Missing required environment variables: {', '.join(sorted(set(missing)))}"
        ) from e
    raise