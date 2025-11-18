from fastapi import APIRouter, HTTPException, status, Request
from core.log_util import logger_instance
from app.modules.inline_qna.services import InlineQnaService
from app.modules.inline_qna.schema import (
    InlineQnaRequest,
    InlineQnaResponse,
)
from datetime import datetime

# Create router
router = APIRouter(prefix="/inline-qna", tags=["inline-qna"])

# Initialize service
inline_qna_service = InlineQnaService()


@router.post("/answer", response_model=InlineQnaResponse)
async def answer_query(
    request: InlineQnaRequest,
    req: Request,
) -> InlineQnaResponse:
    """
    Answer a user's inline query.

    Args:
        request: The request containing query, page_id, repo_hash, and mentioned_definitions

    Returns:
        Response containing the query, page_id, generated answer, and creation timestamp
    """
    try:
        logger_instance.info(f"Received inline Q&A request for page: {request.page_id}")
        logger_instance.info(f"Query: {request.query}")
        # Generate answer using the service
        result = inline_qna_service.answer_query(
            user_id=req.state.user_id,
            query=request.query,
            page_id=request.page_id,
            mentioned_definitions=request.mentioned_definitions,
            repo_hash=request.repo_hash,
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
            query=result["query"],
            page_id=result["page_id"],
            answer=result["answer"],
            created_at=datetime.now(),
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
