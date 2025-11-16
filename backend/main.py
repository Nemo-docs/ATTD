import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# Import and include routes (before app creation to avoid module level import issues)
from app.modules.auto_generation.routes import router as auto_generation_router
from app.modules.page_management.routes import router as page_management_router
from app.modules.inline_qna.routes import router as inline_qna_router
from app.modules.chat_qa.routes import router as chat_qa_router
from app.modules.git_repo_setup import routes as git_repo_routes
from app.modules.user_module.routes import router as user_router
from app.modules.snippet_management.routes import router as snippet_router
from app.modules.mcp_controller.routes import router as mcp_controller_router

# no direct datetime usage in this module
from contextlib import asynccontextmanager

# Load environment variables
from core.config import settings
 
 # Import custom logger
from core.log_util import logger_instance 
logger_instance.info("logging initialized")

# Import middleware
from core.middleware import auth_middleware



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events."""
    # Startup
    try:
        from core.clients import mongodb_client

        # Ping the database to verify connection
        mongodb_client.admin.command("ping")
        logger_instance.info("Database connection validated successfully")
    except Exception as e:
        logger_instance.error(f"Database connection failed: {e}")
    yield

    # Shutdown
    logger_instance.info("Shutting down ATTD Backend")


# Create FastAPI app with lifespan
app = FastAPI(
    title="ATTD Backend",
    description="AI-Powered Technical Documentation Generator",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:1430",
        settings.FRONTEND_BASE_URL
    ],  # Frontend origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

app.add_middleware(BaseHTTPMiddleware, dispatch=auth_middleware)

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

# Include MCP controller routes
app.include_router(mcp_controller_router, prefix="/api", tags=["mcp-controller"])


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
