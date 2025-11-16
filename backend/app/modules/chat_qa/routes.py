from fastapi import APIRouter, HTTPException, status, Request
import logging

from app.modules.chat_qa.service import ChatQaService
from app.modules.chat_qa.schema import (
    ChatQaRequest,
    ChatQaResponse,
    ChatConversationRequest,
    ChatConversationResponse,
)

# Create router
router = APIRouter(prefix="/chat-qa", tags=["chat-qa"])

# Initialize service
chat_qa_service = ChatQaService()
logger = logging.getLogger(__name__)


@router.post("/message", response_model=ChatQaResponse)
async def send_chat_message(
    request: ChatQaRequest,
    req: Request,
) -> ChatQaResponse:
    """
    Send a chat message and get AI response.

    This endpoint processes a user's chat message and returns an AI-generated response
    using the OpenRouter client. Supports optional conversation and page context.

    Args:
        request: The request containing the message and optional context

    Returns:
        Response containing the AI-generated answer and metadata
    """
    try:
        # Get user_id from request state (set by middleware)
        user_id = req.state.user_id

        logger.info(f"Received chat message: {request.message[:50]}...")
        logger.info(f"Conversation ID: {request.conversation_id}")
        logger.info(f"Page ID: {request.page_id}")
        logger.info(f"Repo Hash: {request.repo_hash}")
        logger.info(f"Think level: {getattr(request, 'think_level', None)}")
        logger.info(f"User ID: {user_id}")

        # Route the request to the appropriate handler in the service
        result = chat_qa_service.route_request(request, user_id)

        # Check if there was an error during generation
        if "error" in result:
            logger.error(f"Chat generation failed: {result['error']}")
            status_code_value = (
                status.HTTP_400_BAD_REQUEST
                if result["error"] == "user_id is required"
                else status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            raise HTTPException(
                status_code=status_code_value,
                detail=f"Failed to generate response: {result['error']}",
            )

        # Convert to response model
        response = ChatQaResponse(
            id=result["id"],
            message=result["message"],
            response=result["response"],
            conversation_id=result["conversation_id"],
            page_id=result["page_id"],
            diagram_mode=result["diagram_mode"],
            model_used=result["model_used"],
            tokens_used=result["tokens_used"],
            created_at=result["created_at"],
            user_id=user_id,
        )

        logger.info(f"Successfully generated chat response: {response.id}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in send_chat_message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.post("/conversation", response_model=ChatConversationResponse)
async def create_conversation(
    request: ChatConversationRequest,
    req: Request,
) -> ChatConversationResponse:
    """
    Create a new chat conversation.

    This endpoint creates a new conversation context for organizing chat messages.

    Args:
        request: The request containing optional title and page context

    Returns:
        Response containing the new conversation information
    """
    try:
        # Get user_id from request state (set by middleware)
        user_id = req.state.user_id

        logger.info(f"Creating new conversation with title: {request.title}")
        logger.info(f"Associated page ID: {request.page_id}")
        logger.info(f"User ID: {user_id}")

        # Create conversation using the service
        result = chat_qa_service.create_conversation(
            title=request.title,
            page_id=request.page_id,
            user_id=user_id,
        )

        # Check if there was an error during creation
        if "error" in result:
            logger.error(f"Conversation creation failed: {result['error']}")
            status_code_value = (
                status.HTTP_400_BAD_REQUEST
                if result["error"].startswith("user_id")
                else status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            raise HTTPException(
                status_code=status_code_value,
                detail=f"Failed to create conversation: {result['error']}",
            )

        # Convert to response model
        response = ChatConversationResponse(
            id=result["id"],
            title=result["title"],
            page_id=result["page_id"],
            message_count=result["message_count"],
            created_at=result["created_at"],
            updated_at=result["updated_at"],
            user_id=result["user_id"],
        )

        logger.info(f"Successfully created conversation: {response.id}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in create_conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get("/conversations", response_model=list[ChatConversationResponse])
async def list_conversations(req: Request):
    """List conversations for the authenticated user."""
    try:
        user_id = req.state.user_id
        results = chat_qa_service.get_conversations(user_id=user_id)
        return results
    except ValueError as e:
        logger.error(f"Failed to list conversations: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to list conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/conversation/{conversation_id}")
async def get_conversation_messages(conversation_id: str, req: Request):
    """Return messages for a conversation belonging to the authenticated user."""
    try:
        user_id = req.state.user_id
        messages = chat_qa_service.get_conversation_messages(
            conversation_id, user_id=user_id
        )
        return {"messages": messages}
    except ValueError as e:
        logger.error(f"Failed to get conversation messages: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get conversation messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
