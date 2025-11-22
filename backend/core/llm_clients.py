# from openai import OpenAI
from types import SimpleNamespace
from langfuse.openai import openai
from langfuse.openai import AsyncOpenAI
from core.config import settings


# Initialize Azure OpenAI Client
_azure_openai_client = openai.OpenAI(
    base_url=settings.AZURE_API_BASE,
    api_key=settings.AZURE_API_KEY,
)


# Initialize OpenRouter Client
_open_router_client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
)

# Initialize Azure OpenAI Async Client
async_azure_client = AsyncOpenAI(base_url=settings.AZURE_API_BASE, api_key=settings.AZURE_API_KEY)


class UnifiedLLMClient:
    """
    Unified LLM client that automatically routes requests to the appropriate backend
    (Azure or OpenRouter) based on the model name.
    """
    
    AZURE_MODELS = {"gpt-5", "gpt-5-mini", "gpt-4o-mini", "gpt-5-nano"}
    
    def __init__(self, azure_client: openai.OpenAI, openrouter_client: openai.OpenAI):
        self._azure_client = azure_client
        self._openrouter_client = openrouter_client
        
        # Create the chat.completions structure using closures
        def create(model: str, **kwargs):
            """Create a completion using the appropriate client based on model name."""
            client = self._azure_client if model in self.AZURE_MODELS else self._openrouter_client
            return client.chat.completions.create(model=model, **kwargs)
        
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=create)
        )

# Create a single unified client instance
llm_client = UnifiedLLMClient(_azure_openai_client, _open_router_client)


"""

    Example usage:
    # Azure models (gpt-5, gpt-5-mini, gpt-4o-mini) will use Azure client
    response = llm_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Hello"}]
    )
    
    # Other models will use OpenRouter client
    response = llm_client.chat.completions.create(
        model="anthropic/claude-3.7-sonnet",
        messages=[{"role": "user", "content": "Hello"}]
    )
"""