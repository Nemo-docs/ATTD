from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


class CreateGitRepoRequest(BaseModel):
    github_url: HttpUrl


class CreateGitRepoResponse(BaseModel):
    repo_hash: str
    project_intro: Optional[str] = None
    project_data_flow_diagram: Optional[str] = None
    project_cursory_explanation: Optional[str] = None
    github_url: Optional[HttpUrl] = None
    name: Optional[str] = None


class GetGitRepoResponse(BaseModel):
    repo_hash: str
    repo_path: Optional[str] = None
    project_intro: Optional[str] = None
    project_data_flow_diagram: Optional[str] = None
    project_cursory_explanation: Optional[str] = None
    saved_to_db: Optional[bool] = None
    retrieved_from_db: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    error: Optional[str] = None
    github_url: Optional[HttpUrl] = None
    name: Optional[str] = None
