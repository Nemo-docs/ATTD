from pydantic import BaseModel

class AutocompleteRequest(BaseModel):
    pre_context: str
    post_context: str

class AutocompleteResponse(BaseModel):
    suggestion: str