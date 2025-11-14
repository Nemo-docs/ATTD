from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List



class MerkleFileRecord(BaseModel):
    """Model representing a file with its Merkle hash."""

    path: str = Field(description="Relative path of the file from repository root")
    hash: str = Field(description="SHA256 Merkle hash of the file content")
    role: Optional[str] = Field(
        default=None, description="Human-readable description of the file"
    )

class MerkleDirectoryRecord(BaseModel):
    """Model representing a directory with its Merkle tree hash."""

    path: str = Field(description="Relative path of the directory from repository root")
    hash: str = Field(description="SHA256 hash of the directory tree structure")
    children: List[str] = Field(
        default_factory=list, description="List of immediate child file/directory names"
    )
    role: Optional[str] = Field(
        default=None, description="Human-readable description of the directory"
    )

class MerkleTreeData(BaseModel):
    """Complete Merkle tree data structure for a repository."""

    root_hash: str = Field(
        description="SHA256 hash of the root directory tree structure"
    )
    total_files: int = Field(description="Total number of files in the tree")
    total_directories: int = Field(description="Total number of directories in the tree")
    files: List[MerkleFileRecord] = Field(
        default_factory=list, description="List of all files with their hashes"
    )
    directories: List[MerkleDirectoryRecord] = Field(
        default_factory=list, description="List of all directories with their hashes"
    )

class GitRepoModel(BaseModel):
    """Model representing a git repository in the system."""

    github_url: str = Field(description="The GitHub repository URL")
    repo_hash: str = Field(
        description="SHA256 hash of the GitHub URL, used as unique identifier"
    )
    repo_name: str = Field(description="Name of the repository")
    latest_commit_hash: Optional[str] = Field(
        default=None, description="The latest commit hash from the repository"
    )
    s3_key: str = Field(
        description="S3 key where the zipped repository is stored (typically the repo_hash)"
    )
    local_path: Optional[str] = Field(
        default=None, description="Local disk path where the repository is cloned"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Repository record creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Repository record last update timestamp"
    )
    merkle_tree: Optional[MerkleTreeData] = Field(
        default=None, description="Merkle tree structure for repository file hashing"
    )

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

