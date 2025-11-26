import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from core.middleware import auth_middleware

# Import and include routes (before app creation to avoid module level import issues)
from app.modules.auto_generation.routes import router as auto_generation_router
from app.modules.page_management.routes import router as page_management_router
from app.modules.inline_qna.routes import router as inline_qna_router
from app.modules.chat_qa.routes import router as chat_qa_router
from app.modules.git_repo_setup import routes as git_repo_routes
from app.modules.user_module.routes import router as user_router
from app.modules.snippet_management.routes import router as snippet_router
from app.modules.mcp_controller.routes import router as mcp_controller_router
from app.modules.api_keys.routes import router as api_keys_router
from app.modules.autocompletion.routes import router as autocompletion_router

# no direct datetime usage in this module
from contextlib import asynccontextmanager

# Load environment variables
from core.config import settings
 
# Database
from core.postgres_db import engine, init_tables, verify_postgres_connection
from core.clients import mongodb_client, redis_client

 # Import custom logger
from core.logger import logger_instance 




logger_instance.info("logging initialized")



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events."""
    # Startup
    try:
        # Ping the database to verify connection
        await mongodb_client.admin.command("ping")
        logger_instance.info("MongoDB connection validated successfully")

        # Postgres init and connectivity check
        await init_tables()
        await verify_postgres_connection()
        logger_instance.info("Postgres connection validated successfully")

        # Redis initialization and health check
        app.state.redis = redis_client
        await app.state.redis.set("startup_check", "ok")
        assert await app.state.redis.get("startup_check") == "ok"
        logger_instance.info("Redis connection validated successfully")

        yield

    except Exception as e:
        logger_instance.error(f"Database connection failed: {e}")
        raise

    finally:
        # Cleanup
        # Cleaning up redis
        if hasattr(app.state, "redis"):
            await app.state.redis.aclose()

        # Cleaning up postgres
        await engine.dispose()  

        logger_instance.info("Shutting down ATTD Backend")



# Create FastAPI app with lifespan
app = FastAPI(
    title="ATTD Backend",
    description="AI-Powered Technical Documentation Generator",
    version="1.0.0",
    lifespan=lifespan,
)

# Add authentication middleware before CORS
app.add_middleware(BaseHTTPMiddleware, dispatch=auth_middleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:1430",
        settings.FRONTEND_BASE_URL,
    ],  # Frontend origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Include auto generation routes
app.include_router(auto_generation_router, prefix="/api", tags=["auto-generation"])

# Include page management routes
app.include_router(page_management_router, prefix="/api", tags=["page-management"])

# Include snippet management routes
app.include_router(snippet_router, prefix="/api", tags=["snippet-management"])

# Include inline Q&A routes
app.include_router(inline_qna_router, prefix="/api", tags=["inline-qna"])

# Include chat Q&A routes
app.include_router(chat_qa_router, prefix="/api", tags=["chat-qa"])

# Include git repo setup routes
app.include_router(git_repo_routes.router, prefix="/api", tags=["git-repo-setup"])

# Include user routes
app.include_router(user_router, prefix="/api")

# Include API keys routes
app.include_router(api_keys_router, prefix="/api", tags=["api-keys"])

# Include MCP controller routes
app.include_router(mcp_controller_router, prefix="/api", tags=["mcp-controller"])

# Include autocompletion routes
app.include_router(autocompletion_router, prefix="/api", tags=["autocompletion"])

# Define basic routes
@app.get("/")
async def root():
    return {"message": f"Hello from ATTD {settings.FRONTEND_BASE_URL} !"}


@app.get("/health")
async def health():
    """Basic health check endpoint."""
    return {"status": "healthy", "service": "ATTD Backend"}


def main():
    logger_instance.info("Starting backend server...")
    uvicorn.run(
        "main:app",  # Use import string for reload to work
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload on code changes
        reload_dirs=["./app"],  # Watch app directory for changes
    )



if __name__ == "__main__":
    main()
