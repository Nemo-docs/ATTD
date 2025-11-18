from pydantic import BaseModel


class EchoPayload(BaseModel):
    text: str
