from clerk_backend_api import Clerk
from utils.config import ENV

# Initialize Clerk SDK
clerk_client = Clerk(bearer_auth=ENV.CLERK_SECRET_KEY)

# Define public paths that bypass authentication
PUBLIC_PREFIXES = ("/health",)
