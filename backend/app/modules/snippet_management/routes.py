from fastapi import APIRouter, HTTPException, status, Request
from core.log_util import logger_instance

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

@router.post("/create", response_model=CreateSnippetResponse)
async def create_snippet(request: Request, snippet_request: CreateSnippetRequest) -> CreateSnippetResponse:
    user_id = request.state.user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in request state")
    try:
        logger_instance.info(f"Creating snippet for user {user_id}")
        result = snippet_service.create_snippet(user_id=user_id, content=snippet_request.content, tags=snippet_request.tags)
        if "error" in result:
            logger_instance.error(f"Snippet creation failed: {result['error']}")
            status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
            raise HTTPException(status_code=status_code_value, detail=f"Failed to create snippet: {result['error']}")

        return CreateSnippetResponse(snippet=result["snippet"], message=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        logger_instance.error(f"Unexpected error in create_snippet: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@router.get("/", response_model=GetSnippetsResponse)
async def get_all_snippets(request: Request) -> GetSnippetsResponse:
    user_id = request.state.user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in request state")
    try:
        logger_instance.info(f"Retrieving all snippets for user {user_id}")
        result = snippet_service.get_all_snippets(user_id=user_id)
        if "error" in result:
            logger_instance.error(f"Failed to retrieve snippets: {result['error']}")
            status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
            raise HTTPException(status_code=status_code_value, detail=f"Failed to retrieve snippets: {result['error']}")

        return GetSnippetsResponse(snippets=result["snippets"], total_count=result["total_count"])
    except HTTPException:
        raise
    except Exception as e:
        logger_instance.error(f"Unexpected error in get_all_snippets: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@router.get("/sync/status", response_model=SyncStatusResponse)
async def get_sync_status(request: Request) -> SyncStatusResponse:
    user_id = request.state.user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in request state")
    try:
        logger_instance.info(f"Fetching sync status for user {user_id}")
        result = snippet_service.get_sync_status(user_id=user_id)
        if "error" in result:
            status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
            raise HTTPException(status_code=status_code_value, detail=f"Failed to obtain sync status: {result['error']}")
        return SyncStatusResponse(last_unix_timestamp=result["last_unix_timestamp"], total_count=result["total_count"])
    except HTTPException:
        raise
    except Exception as e:
        logger_instance.error(f"Unexpected error in get_sync_status: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@router.post("/sync", response_model=SyncSnippetsResponse)
async def sync_snippets(request: Request, sync_request: SyncSnippetsRequest) -> SyncSnippetsResponse:
    user_id = request.state.user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in request state")
    try:
        logger_instance.info(f"Syncing snippets for user {user_id}")
        local_payloads = [snippet.dict(by_alias=False) for snippet in sync_request.snippets]
        result = snippet_service.sync_snippets(
            user_id=user_id,
            local_snippets=local_payloads,
            client_last_edit_unix=sync_request.last_edit_unix,
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
        logger_instance.error(f"Unexpected error in sync_snippets: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@router.post("/ensure_collection", response_model=EnsureCollectionResponse)
async def ensure_collection(request: Request) -> EnsureCollectionResponse:
    user_id = request.state.user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in request state")
    try:
        logger_instance.info(f"Ensuring snippets collection for user {user_id}")
        result = snippet_service.ensure_collection(user_id=user_id)
        if "error" in result:
            status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
            raise HTTPException(status_code=status_code_value, detail=f"Failed to ensure collection: {result['error']}")
        return EnsureCollectionResponse(message=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        logger_instance.error(f"Unexpected error in ensure_collection: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@router.get("/{snippet_id}", response_model=GetSnippetResponse)
async def get_snippet(request: Request, snippet_id: str) -> GetSnippetResponse:
    user_id = request.state.user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in request state")
    try:
        logger_instance.info(f"Retrieving snippet {snippet_id} for user {user_id}")
        result = snippet_service.get_snippet(snippet_id, user_id=user_id)
        if result is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Snippet not found with ID: {snippet_id}")
        if "error" in result:
            logger_instance.error(f"Database error: {result['error']}")
            status_code_value = status.HTTP_400_BAD_REQUEST if result["error"] == "user_id is required" else status.HTTP_500_INTERNAL_SERVER_ERROR
            raise HTTPException(status_code=status_code_value, detail=f"Database error: {result['error']}")

        from .models import SnippetModel

        snippet_model = SnippetModel(**result)
        return GetSnippetResponse(snippet=snippet_model)
    except HTTPException:
        raise
    except Exception as e:
        logger_instance.error(f"Unexpected error in get_snippet: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@router.put("/{snippet_id}", response_model=UpdateSnippetResponse)
async def update_snippet(request: Request, snippet_id: str, update_request: UpdateSnippetRequest) -> UpdateSnippetResponse:
    user_id = request.state.user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in request state")
    try:
        logger_instance.info(f"Updating snippet {snippet_id} for user {user_id}")
        result = snippet_service.update_snippet(snippet_id=snippet_id, user_id=user_id, content=update_request.content, tags=update_request.tags, add_tags=update_request.add_tags)
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
        logger_instance.error(f"Unexpected error in update_snippet: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@router.delete("/{snippet_id}", response_model=DeleteSnippetResponse)
async def delete_snippet(request: Request, snippet_id: str) -> DeleteSnippetResponse:
    user_id = request.state.user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in request state")
    try:
        logger_instance.info(f"Deleting snippet {snippet_id} for user {user_id}")
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
        logger_instance.error(f"Unexpected error in delete_snippet: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")


