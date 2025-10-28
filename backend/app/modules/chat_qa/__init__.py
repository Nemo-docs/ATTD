"""
Chat Q&A Module

This module provides conversational AI functionality using OpenRouter API.
It supports chat-based Q&A with optional conversation and page context.
"""

from .service import ChatQaService
from .schema import (
    ChatQaRequest,
    ChatQaResponse,
    ChatConversationRequest,
    ChatConversationResponse,
    ErrorResponse,
)
from .models import ChatQaModel, ChatConversationModel

__all__ = [
    "ChatQaService",
    "ChatQaRequest",
    "ChatQaResponse",
    "ChatConversationRequest",
    "ChatConversationResponse",
    "ErrorResponse",
    "ChatQaModel",
    "ChatConversationModel",
]
