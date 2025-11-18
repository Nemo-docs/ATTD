from typing_extensions import List
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.modules.chat_qa.schema import MentionedDefinition


class InlineQnaRequest(BaseModel):
    """Request schema for inline Q&A functionality."""

    query: str = Field(
        ...,
        description="The user's query text",
        example="What is the capital of France?",
    )
    page_id: str = Field(
        ...,
        description="The ID of the page where the query originated",
        example="1234567890",
    )
    repo_hash: str = Field(
        ...,
        description="The hash of the repository",
        example="1234567890",
    )
    mentioned_definitions: Optional[List[MentionedDefinition]] = Field(
        None,
        description="Definitions mentioned in the query",
        example=[{"node_name": "Node1", "file_name": "file1.py", "start_end_lines": [1, 10], "node_type": "file"}],
    )


class InlineQnaResponse(BaseModel):
    """Response schema for inline Q&A functionality."""

    query: str = Field(
        ...,
        description="The user's query text",
        example="What is the capital of France?",
    )
    page_id: str = Field(
        ...,
        description="The ID of the page where the query originated",
        example="1234567890",
    )
    answer: str = Field(
        ...,
        description="The AI-generated answer to the query",
        example="The capital of France is Paris.",
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the answer was created",
    )

