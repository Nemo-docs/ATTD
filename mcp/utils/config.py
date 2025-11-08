import os
from dotenv import load_dotenv

load_dotenv()

class ENV:
    """Configuration class for MCP application."""
    def __init__(self):
        self.BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL")
        self.FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL")
        self.CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
        self.PORT = int(os.getenv("PORT"))
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "ERROR")

        self.validate_ENV()
    
    def validate_ENV(self):
        """Validate that required environment variables are set."""
        if not self.BACKEND_BASE_URL:
            raise ValueError("BACKEND_BASE_URL environment variable is not set")
        
        if not self.FRONTEND_BASE_URL:
            raise ValueError("FRONTEND_BASE_URL environment variable is not set")
        
        if not self.CLERK_SECRET_KEY:
            raise ValueError("CLERK_SECRET_KEY environment variable is not set")

        if not self.PORT:
            raise ValueError("PORT environment variable is not set")
        

ENV = ENV()
