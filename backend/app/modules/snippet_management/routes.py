from fastapi import APIRouter, HTTPException, status
from typing import Dict, List
import logging

from .service import SnippetManagementService
from .schema import (
    CreateSnippetRequest,
    CreateSnippetResponse,
    DeleteSnippetResponse,
    EnsureCollectionResponse,
    ErrorResponse,
    GetSnippetResponse,
    GetSnippetsResponse,
    SyncSnippetsRequest,
    SyncSnippetsResponse,
    SyncStatusResponse,
    UpdateSnippetRequest,
    UpdateSnippetResponse,
)

router = APIRouter(prefix="/snippets", tags=["snippet-management"])

snippet_service = SnippetManagementService()
logger = logging.getLogger(__name__)


@router.post("/create", response_model=CreateSnippetResponse)
async def create_snippet(request: CreateSnippetRequest) -> CreateSnippetResponse:
    try:
        logger.info(f"Creating snippet for user {request.user_id}")
        result = snippet_service.create_snippet(user_id=request.user_id, content=request.content, tags=request.tags)
        if "error" in result:
            logger.error(f"Snippet creation failed: {result['error']}")
            status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
            raise HTTPException(status_code=status_code_value, detail=f"Failed to create snippet: {result['error']}")

        return CreateSnippetResponse(snippet=result["snippet"], message=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in create_snippet: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")


@router.get("/", response_model=GetSnippetsResponse)
async def get_all_snippets(user_id: str) -> GetSnippetsResponse:
    try:
        logger.info(f"Retrieving all snippets for user {user_id}")
        result = snippet_service.get_all_snippets(user_id=user_id)
        if "error" in result:
            logger.error(f"Failed to retrieve snippets: {result['error']}")
            status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
            raise HTTPException(status_code=status_code_value, detail=f"Failed to retrieve snippets: {result['error']}")

        return GetSnippetsResponse(snippets=result["snippets"], total_count=result["total_count"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_all_snippets: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")


@router.get("/sync/status", response_model=SyncStatusResponse)
async def get_sync_status(user_id: str) -> SyncStatusResponse:
    try:
        logger.info(f"Fetching sync status for user {user_id}")
        result = snippet_service.get_sync_status(user_id=user_id)
        if "error" in result:
            status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
            raise HTTPException(status_code=status_code_value, detail=f"Failed to obtain sync status: {result['error']}")
        return SyncStatusResponse(last_unix_timestamp=result["last_unix_timestamp"], total_count=result["total_count"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_sync_status: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")


@router.post("/sync", response_model=SyncSnippetsResponse)
async def sync_snippets(request: SyncSnippetsRequest) -> SyncSnippetsResponse:
    try:
        logger.info(f"Syncing snippets for user {request.user_id}")
        local_payloads = [snippet.dict(by_alias=False) for snippet in request.snippets]
        result = snippet_service.sync_snippets(
            user_id=request.user_id,
            local_snippets=local_payloads,
            client_last_edit_unix=request.last_edit_unix,
        )
        if "error" in result:
            status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
            raise HTTPException(status_code=status_code_value, detail=f"Failed to sync snippets: {result['error']}")

        return SyncSnippetsResponse(
            message=result["message"],
            snippets=result["snippets"],
            last_unix_timestamp=result["last_unix_timestamp"],
            was_changed=result["was_changed"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in sync_snippets: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")


@router.post("/ensure_collection", response_model=EnsureCollectionResponse)
async def ensure_collection(user_id: str) -> EnsureCollectionResponse:
    try:
        logger.info(f"Ensuring snippets collection for user {user_id}")
        result = snippet_service.ensure_collection(user_id=user_id)
        if "error" in result:
            status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
            raise HTTPException(status_code=status_code_value, detail=f"Failed to ensure collection: {result['error']}")
        return EnsureCollectionResponse(message=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in ensure_collection: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")


@router.get("/{snippet_id}", response_model=GetSnippetResponse)
async def get_snippet(snippet_id: str, user_id: str) -> GetSnippetResponse:
    try:
        logger.info(f"Retrieving snippet {snippet_id} for user {user_id}")
        result = snippet_service.get_snippet(snippet_id, user_id=user_id)
        if result is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Snippet not found with ID: {snippet_id}")
        if "error" in result:
            logger.error(f"Database error: {result['error']}")
            status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
            raise HTTPException(status_code=status_code_value, detail=f"Database error: {result['error']}")

        from .models import SnippetModel

        snippet_model = SnippetModel(**result)
        return GetSnippetResponse(snippet=snippet_model)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_snippet: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")


@router.put("/{snippet_id}", response_model=UpdateSnippetResponse)
async def update_snippet(snippet_id: str, user_id: str, request: UpdateSnippetRequest) -> UpdateSnippetResponse:
    try:
        logger.info(f"Updating snippet {snippet_id} for user {user_id}")
        result = snippet_service.update_snippet(snippet_id=snippet_id, user_id=user_id, content=request.content, tags=request.tags, add_tags=request.add_tags)
        if "error" in result:
            if "not found" in result["error"].lower():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
            else:
                status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
                raise HTTPException(status_code=status_code_value, detail=f"Failed to update snippet: {result['error']}")
        # ensure we return a SnippetModel instance for consistency with other endpoints
        from .models import SnippetModel

        snippet_data = result["snippet"]
        snippet_model = snippet_data if isinstance(snippet_data, SnippetModel) else SnippetModel(**snippet_data)
        return UpdateSnippetResponse(snippet=snippet_model, message=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in update_snippet: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")


@router.delete("/{snippet_id}", response_model=DeleteSnippetResponse)
async def delete_snippet(snippet_id: str, user_id: str) -> DeleteSnippetResponse:
    try:
        logger.info(f"Deleting snippet {snippet_id} for user {user_id}")
        result = snippet_service.delete_snippet(snippet_id=snippet_id, user_id=user_id)
        if "error" in result:
            if "not found" in result["error"].lower():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
            else:
                status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
                raise HTTPException(status_code=status_code_value, detail=f"Failed to delete snippet: {result['error']}")

        return DeleteSnippetResponse(message=result["message"], deleted_snippet_id=result["deleted_snippet_id"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in delete_snippet: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")


