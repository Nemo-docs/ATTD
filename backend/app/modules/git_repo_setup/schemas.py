from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, Union, List
from datetime import datetime


class CreateGitRepoRequest(BaseModel):
    github_url: HttpUrl


class BaseRepoInfo(BaseModel):
    p2_info: str
    p3_info: str

class ApplicationRepoInfo(BaseRepoInfo):
    overview: str
    setup_and_installation: str
    testing: str

class LibraryRepoInfo(BaseRepoInfo):
    purpose: str
    installation: str
    quick_start_examples: List[str]

class ServiceRepoInfo(BaseRepoInfo):
    service_description: str
    running_locally: str

RepoInfo = Union[ApplicationRepoInfo, LibraryRepoInfo, ServiceRepoInfo]

class ProjectIntroResponse(BaseModel):
    repo_path: str
    repo_hash: str
    repo_type: str
    repo_info: RepoInfo
    github_url: HttpUrl
    name: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    saved_to_db: Optional[bool] = None
    retrieved_from_db: Optional[bool] = None

CreateGitRepoResponse = ProjectIntroResponse
GetGitRepoResponse = ProjectIntroResponse

class UpdateGitRepoResponse(BaseModel):
    up_to_date: bool
