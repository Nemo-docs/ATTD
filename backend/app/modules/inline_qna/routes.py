from fastapi import APIRouter, HTTPException, status
from core.log_util import logger_instance
from app.modules.inline_qna.services import InlineQnaService
from app.modules.inline_qna.schema import (
    InlineQnaRequest,
    InlineQnaResponse,
)

# Create router
router = APIRouter(prefix="/inline-qna", tags=["inline-qna"])

# Initialize service
inline_qna_service = InlineQnaService()

@router.post("/answer", response_model=InlineQnaResponse)
async def answer_query(
    request: InlineQnaRequest,
) -> InlineQnaResponse:
    """
    Answer a user's inline query.

    This endpoint processes a user's query text along with cursor position and page ID,
    and returns an AI-generated answer using the OpenRouter client.

    Args:
        request: The request containing text, cursor_position, and page_id

    Returns:
        Response containing the original query data and the generated answer
    """
    try:
        logger_instance.info(f"Received inline Q&A request for page: {request.page_id}")
        logger_instance.info(f"Request: {request.cursor_position}")
        # Generate answer using the service
        result = inline_qna_service.answer_query(
            text=request.text,
            cursor_position=request.cursor_position,
            page_id=request.page_id,
        )

        # Check if there was an error during generation
        if "error" in result:
            logger_instance.error(f"Q&A generation failed: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate answer: {result['error']}",
            )

        # Convert to response model
        response = InlineQnaResponse(
            text=result["text"],
            cursor_position=result["cursor_position"],
            page_id=result["page_id"],
            answer=result["answer"],
            created_at=result["created_at"],
        )

        logger_instance.info(f"Successfully generated answer for page: {request.page_id}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger_instance.error(f"Unexpected error in answer_query: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )
