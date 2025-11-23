from fastapi import APIRouter
from app.modules.autocompletion.schemas import AutocompleteRequest, AutocompleteResponse
from app.modules.autocompletion.services import autocomplete

# Create router
router = APIRouter(prefix="/autocompletion", tags=["autocompletion"])



@router.post("/ghost", response_model=AutocompleteResponse)
async def ghost_route(req: AutocompleteRequest):
    suggestion = await autocomplete(req.model_dump())
    return AutocompleteResponse(suggestion=suggestion)


