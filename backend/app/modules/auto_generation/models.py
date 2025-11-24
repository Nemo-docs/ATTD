from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Literal, Union



class ApplicationModel(BaseModel):
    overview: str = Field(description="The overview of the application")
    setup_and_installation: str = Field(description="The setup and installation of the application")
    testing: str = Field(description="The testing of the application")
    p2_info: str = Field(description="Explanation about concepts with mermaid diagrams")
    p3_info: str = Field(description="Comprehensive API Documentation for this application in markdown format.")


class LibraryModel(BaseModel):
    purpose: str = Field(description="The purpose of the library")
    installation: str = Field(description="The installation of the library")
    quick_start_examples: List[str] = Field(description="The quick start examples of the library")
    p2_info: str = Field(description="Explanation about concepts with mermaid diagrams")
    p3_info: str = Field(description="Comprehensive API Reference for this library in markdown format.")

class ServiceModel(BaseModel):
    service_description: str = Field(description="The description of the service")
    running_locally: str = Field(description="The running locally of the service")
    p2_info: str = Field(description="Explanation about  concepts with mermaid diagrams")
    p3_info: str = Field(description="Comprehensive API Documentation for this service in markdown format.")

class ProjectIntroModel(BaseModel):
    repo_path: str = Field(description="The path to the project repository")
    repo_hash: str = Field(description="The hash of the project repository, created from repo_path")
    repo_type: Literal["application", "library", "service"] = Field(description="The type of the project repository")
    repo_info: Union[ApplicationModel, LibraryModel, ServiceModel] = Field(description="The information of the project repository")
    cursory_explanation: str = Field(description="The cursory explanation of the project, which is a tree hierarchy of the project files with their roles")
    github_url: str = Field(description="The URL of the project repository")
    name: str = Field(description="The name of the project repository")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Update timestamp")

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class Definition(BaseModel):
    # pydantic class
    node_type:Literal["file", "class", "function"] = Field(description="The type of the definition")
    node_name: str = Field(description="The name of the definition")
    code_snippet:str = Field(description="The code snippet of the definition")
    start_end_lines:List[int] = Field(description="The start and end lines of the definition")
    file_name: str = Field(description="The name of the file")

class Definitions(BaseModel):
    definitions: List[Definition] = Field(description="The definitions of the project")
    repo_hash: str = Field(description="The hash of the project repository, created from repo_path")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Update timestamp")
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

