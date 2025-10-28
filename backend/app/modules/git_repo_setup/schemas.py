from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


class CreateGitRepoRequest(BaseModel):
    github_url: HttpUrl


class CreateGitRepoResponse(BaseModel):
    repo_hash: str
    project_intro: Optional[str]
    project_data_flow_diagram: Optional[str]
    project_cursory_explanation: Optional[str]
    github_url: Optional[HttpUrl]
    name: Optional[str]


class GetGitRepoResponse(BaseModel):
    repo_hash: str
    repo_path: Optional[str]
    project_intro: Optional[str]
    project_data_flow_diagram: Optional[str]
    project_cursory_explanation: Optional[str]
    saved_to_db: Optional[bool]
    retrieved_from_db: Optional[bool]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    error: Optional[str]
    github_url: Optional[HttpUrl]
    name: Optional[str]
