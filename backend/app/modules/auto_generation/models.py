from pydantic import BaseModel, Field
from datetime import datetime


class ProjectIntroModel(BaseModel):
    repo_path: str = Field(description="The path to the project repository")
    repo_hash: str = Field(description="The hash of the project repository, created from repo_path")
    project_intro: str = Field(description="The introduction of the project, which is relevant for understanding the project, not the code")
    project_data_flow_diagram: str = Field(description="The data flow diagram of the project, which is a markdown mermaid diagram of the project data flow")
    project_cursory_explanation: str = Field(description="The cursory explanation of the project, which is a tree hierarchy of the project files with their roles")
    github_url: str = Field(description="The URL of the project repository")
    name: str = Field(description="The name of the project repository")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Update timestamp")

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
