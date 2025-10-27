import subprocess
import tempfile
import os
import shutil
from uuid import uuid4

def parse_github_url(repo_url: str) -> str:
    """
    Convert letsnemo.com URL to public GitHub HTTPS URL.

    Args:
        repo_url: letsnemo.com URL (e.g. 'https://letsnemo.com/USERNAME/REPOSITORY.git')

    Returns:
        public GitHub HTTPS URL (e.g. 'https://github.com/USERNAME/REPOSITORY.git')

    Raises:
        ValueError: If the input URL does not start with "https://letsnemo.com/"
    """
    prefix = "https://letsnemo.com/"
    if not repo_url.startswith(prefix):
        raise ValueError(f"URL must start with {prefix}")
    
    remainder = repo_url[21:] # len("https://letsnemo.com/") is 21
    parts = remainder.split('/')
    if len(parts) != 2:
        raise ValueError("Expected format: https://letsnemo.com/USERNAME/REPOSITORY.git")
    
    username, repo = parts
    if not username or not repo:
        raise ValueError("Invalid username or repository name")
    
    return f"https://github.com/{username}/{repo}"


def clone_github_repo(repo_url: str) -> dict:
    """
    Clone a public GitHub repository to a temporary directory.
    
    Args:
        repo_url: HTTPS URL of the public GitHub repository
        
    Returns:
        Dictionary containing repo_path, file_count, and file list
        
    Raises:
        ValueError: If the URL is not a valid GitHub HTTPS URL
        RuntimeError: If git clone fails
    """
    # Validate GitHub URL
    if not repo_url.startswith("https://github.com/"):
        raise ValueError("Only public GitHub HTTPS URLs are supported.")
        # Create a unique temp directory
    repo_dir = os.path.join(tempfile.gettempdir(), f"repo_{uuid4().hex}")
    
    try:
        # Clone the repository (depth 1 for faster cloning) fetches only the latest commit.
        result = subprocess.run(
            ["git", "clone", "--depth", "1", repo_url, repo_dir],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Clone failed: {e.stderr.strip()}")
    except FileNotFoundError:
        raise RuntimeError("Git not found")
    
    return {"repo_path": repo_dir}


def clean_up_repo(repo_path: str):
    """
    Clean up the cloned repository directory.
    
    Args:
        repo_path: Path to the repository directory to remove
    """
    if os.path.exists(repo_path):
        shutil.rmtree(repo_path)

