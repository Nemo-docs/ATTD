import os
import hashlib
import httpx
import subprocess
import shutil
from datetime import datetime
import tempfile
from pymongo.errors import PyMongoError
from typing import Dict, List, Tuple, Any
from urllib.parse import urlparse
from core.clients import mongodb_client
from core.config import settings
from core.logger import logger_instance
from utils.s3_utils import s3, zip_folder, upload_file_to_s3, download_and_extract_zip
from app.modules.git_repo_setup.models import (
    GitRepoModel,
    MerkleTreeData,
    MerkleFileRecord,
    MerkleDirectoryRecord,
)


class MerkleHashService:
    """Service for computing repository hashes and managing repo updates."""

    def __init__(self):
        """Initialize RepoUpdateService."""
        self.DEFAULT_IGNORE = {
            ".git",
            "node_modules",
            ".venv",
            "__pycache__",
            ".pytest_cache",
            ".DS_Store",
            ".gitignore",
        }

    def hash_data(self, data: bytes) -> str:
        """Compute SHA256 hash of binary data.

        Args:
            data: Binary data to hash

        Returns:
            Lowercase hexadecimal SHA256 digest
        """
        return hashlib.sha256(data).hexdigest()


    def compute_file_hash(self, file_path: str, chunk_size: int = 1_048_576) -> str:
        """Compute Merkle root hash for a file using fixed-size chunks.

        For files that fit in one chunk, returns sha256(content).
        For larger files, builds a Merkle tree from chunk hashes.

        Args:
            file_path: Path to the file to hash
            chunk_size: Size of chunks in bytes (default: 1MB)

        Returns:
            Hexadecimal Merkle root hash
        """
        chunk_hashes = []

        with open(file_path, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                chunk_hash = self.hash_data(chunk)
                chunk_hashes.append(chunk_hash)

        # Handle empty file
        if len(chunk_hashes) == 0:
            return self.hash_data(b"")

        # Single chunk: return its hash directly
        if len(chunk_hashes) == 1:
            return chunk_hashes[0]

        # Multiple chunks: build Merkle tree
        while len(chunk_hashes) > 1:
            next_level = []
            for i in range(0, len(chunk_hashes), 2):
                left = chunk_hashes[i]
                # If odd number, duplicate last node
                right = (
                    chunk_hashes[i + 1]
                    if i + 1 < len(chunk_hashes)
                    else chunk_hashes[i]
                )
                parent = self.hash_data(bytes.fromhex(left) + bytes.fromhex(right))
                next_level.append(parent)
            chunk_hashes = next_level

        return chunk_hashes[0]


    def compute_directory_tree_hash(self, root_dir: str) -> Dict[str, str]:
        """Compute Merkle hashes for all files in a directory tree.

        Args:
            root_dir: Root directory to scan

        Returns:
            Dictionary mapping relative file paths to their Merkle root hashes
        """
        file_hashes = {}

        for dirpath, dirnames, filenames in os.walk(root_dir, followlinks=True):
            # Filter out ignored directories in-place
            dirnames[:] = [d for d in dirnames if d not in self.DEFAULT_IGNORE]

            for filename in filenames:
                if filename in self.DEFAULT_IGNORE:
                    continue

                full_path = os.path.join(dirpath, filename)
                relative_path = os.path.relpath(full_path, root_dir)

                try:
                    file_hash = self.compute_file_hash(full_path)
                    file_hashes[relative_path] = file_hash
                except (IOError, OSError):
                    # Skip files that can't be read
                    continue

        return file_hashes


    def compute_merkle_tree(self, root_dir: str) -> Tuple[str, List[Dict], List[Dict]]:
        """Compute Git-style directory tree hash with Merkle file hashes.

        Args:
            root_dir: Root directory to scan

        Returns:
            Tuple of (root_hash, file_records, dir_records) where:
            - root_hash: SHA256 hash of the root directory tree
            - file_records: List of dicts with 'path' and 'hash' for each file
            - dir_records: List of dicts with 'path', 'hash', and 'children' for each directory
        """
        file_records = []
        dir_records = []

        def compute_tree_hash(dir_path: str) -> str:
            """Recursively compute hash for a directory."""
            entries = []
            children = []

            try:
                items = sorted(os.listdir(dir_path))
            except (IOError, OSError):
                # Can't read directory, return empty hash
                return self.hash_data(b"")

            for item in items:
                if item in self.DEFAULT_IGNORE:
                    continue

                item_path = os.path.join(dir_path, item)
                relative_path = os.path.relpath(item_path, root_dir)

                if os.path.isfile(item_path):
                    try:
                        file_hash = self.compute_file_hash(item_path)
                        entry = f"blob {item} {file_hash}"
                        entries.append(entry)
                        children.append(item)
                        file_records.append({"path": relative_path, "hash": file_hash})
                    except (IOError, OSError):
                        continue
                elif os.path.isdir(item_path):
                    dir_hash = compute_tree_hash(item_path)
                    entry = f"tree {item} {dir_hash}"
                    entries.append(entry)
                    children.append(item)

            # Compute directory hash from sorted entries
            tree_content = "\n".join(entries)
            dir_hash = self.hash_data(tree_content.encode("utf-8"))

            # Record directory info
            relative_dir_path = os.path.relpath(dir_path, root_dir)
            if relative_dir_path != ".":
                dir_records.append(
                    {"path": relative_dir_path, "hash": dir_hash, "children": children}
                )

            return dir_hash

        root_hash = compute_tree_hash(root_dir)

        # Add root directory record
        try:
            root_children = sorted(
                [
                    item
                    for item in os.listdir(root_dir)
                    if item not in self.DEFAULT_IGNORE
                ]
            )
        except (IOError, OSError):
            root_children = []

        dir_records.insert(
            0, {"path": ".", "hash": root_hash, "children": root_children}
        )

        return root_hash, file_records, dir_records


    def compare_merkle_trees(self, merkle_tree_1: Dict[str, Any], merkle_tree_2: Dict[str, Any]) -> Dict[str, Any]:
        """Compare two merkle trees and return detailed differences.

        This function performs a pure comparison and returns ONLY the differences.
        Use the returned data to update the MerkleTreeData model fields (including role).

        Args:
            merkle_tree_1: First merkle tree (old/original state) as dict
            merkle_tree_2: Second merkle tree (new/current state) as dict

        Returns:
            Dict containing differences:
                - root_hash_changed: bool
                - old_root_hash: str
                - new_root_hash: str
                - files: Dict with changes
                    - added: List[Dict] with path, hash
                    - removed: List[Dict] with path, hash
                    - modified: List[Dict] with path, old_hash, new_hash
                - directories: Dict with changes
                    - added: List[Dict] with path, hash, children
                    - removed: List[Dict] with path, hash, children
                    - modified: List[Dict] with path, old_hash, new_hash, old_children, new_children
                - summary: Statistics
        """
        # Extract data from both trees
        files_1 = {f["path"]: f for f in merkle_tree_1.get("files", [])}
        files_2 = {f["path"]: f for f in merkle_tree_2.get("files", [])}

        dirs_1 = {d["path"]: d for d in merkle_tree_1.get("directories", [])}
        dirs_2 = {d["path"]: d for d in merkle_tree_2.get("directories", [])}

        # Get all unique paths
        all_file_paths = set(files_1.keys()) | set(files_2.keys())
        all_dir_paths = set(dirs_1.keys()) | set(dirs_2.keys())

        # Initialize result structure with ONLY differences
        result = {
            "root_hash_changed": merkle_tree_1.get("root_hash")
            != merkle_tree_2.get("root_hash"),
            "old_root_hash": merkle_tree_1.get("root_hash"),
            "new_root_hash": merkle_tree_2.get("root_hash"),
            "files": {
                "added": [],
                "removed": [],
                "modified": [],
            },
            "directories": {
                "added": [],
                "removed": [],
                "modified": [],
            },
        }

        # Compare files - track only differences
        for path in all_file_paths:
            file_1 = files_1.get(path)
            file_2 = files_2.get(path)

            if file_1 is None:
                # File added in tree2
                result["files"]["added"].append(
                    {
                        "path": path,
                        "hash": file_2["hash"],
                    }
                )
            elif file_2 is None:
                # File removed from tree1
                result["files"]["removed"].append(
                    {
                        "path": path,
                        "hash": file_1["hash"],
                    }
                )
            elif file_1["hash"] != file_2["hash"]:
                # File modified (different hash)
                result["files"]["modified"].append(
                    {
                        "path": path,
                        "old_hash": file_1["hash"],
                        "new_hash": file_2["hash"],
                    }
                )

        # Compare directories - track only differences
        for path in all_dir_paths:
            dir_1 = dirs_1.get(path)
            dir_2 = dirs_2.get(path)

            if dir_1 is None:
                # Directory added in tree2
                result["directories"]["added"].append(
                    {
                        "path": path,
                        "hash": dir_2["hash"],
                        "children": dir_2.get("children", []),
                    }
                )
            elif dir_2 is None:
                # Directory removed from tree1
                result["directories"]["removed"].append(
                    {
                        "path": path,
                        "hash": dir_1["hash"],
                        "children": dir_1.get("children", []),
                    }
                )
            elif dir_1["hash"] != dir_2["hash"]:
                # Directory modified (different hash or children)
                old_children = set(dir_1.get("children", []))
                new_children = set(dir_2.get("children", []))
                
                result["directories"]["modified"].append(
                    {
                        "path": path,
                        "old_hash": dir_1["hash"],
                        "new_hash": dir_2["hash"],
                        "old_children": dir_1.get("children", []),
                        "new_children": dir_2.get("children", []),
                        "children_added": list(new_children - old_children),
                        "children_removed": list(old_children - new_children),
                    }
                )

        # Add summary statistics
        result["summary"] = {
            "total_changes": (
                len(result["files"]["added"])
                + len(result["files"]["removed"])
                + len(result["files"]["modified"])
                + len(result["directories"]["added"])
                + len(result["directories"]["removed"])
                + len(result["directories"]["modified"])
            ),
            "files_added": len(result["files"]["added"]),
            "files_removed": len(result["files"]["removed"]),
            "files_modified": len(result["files"]["modified"]),
            "directories_added": len(result["directories"]["added"]),
            "directories_removed": len(result["directories"]["removed"]),
            "directories_modified": len(result["directories"]["modified"]),
        }

        return result


class GitRepoManagementService:
    def __init__(self):
        self.merkle_service = MerkleHashService()
        self.db = mongodb_client[settings.DB_NAME]
        self.git_repos_collection = self.db["git_repos"]
        self._indexes_created = False

    async def _ensure_indexes(self) -> None:
        """Ensure indexes exist. Called lazily on first DB operation."""
        if not self._indexes_created:
            try:
                await self.git_repos_collection.create_index("repo_hash", unique=True)
                logger_instance.info(
                    "Created unique index on repo_hash in git_repos collection"
                )
                self._indexes_created = True
            except PyMongoError as e:
                logger_instance.error(f"Could not create index: {e}")


    def _normalize_github_url(self, github_url: str) -> str:
        """Return canonical form of a GitHub repo URL: strip trailing slash and ensure .git suffix."""
        url = github_url.rstrip("/")
        if not url.endswith(".git"):
            url = url + ".git"
        return url

    def _generate_repo_hash(self, github_url: str) -> str:
        normalized = self._normalize_github_url(github_url)
        return hashlib.sha256(normalized.encode()).hexdigest()


    def _repo_name_from_url(self, github_url: str) -> str:
        path = urlparse(github_url).path.strip("/")
        name = path.split("/")[-1]
        return name.replace(".git", "")


    async def save_git_repo_db(self, git_repo: GitRepoModel) -> Dict[str, Any]:
        """
        Save a GitRepoModel into the MongoDB git_repos collection.
        
        Uses upsert to insert or update based on repo_hash (unique identifier).
        Updates the updated_at timestamp on every save.
        
        Args:
            git_repo: GitRepoModel instance to save
            
        Returns:
            Dict with keys:
                - upserted_id: MongoDB document ID if inserted
                - error: error message if failed
        """
        try:
            await self._ensure_indexes()
            # Update the updated_at timestamp
            git_repo.updated_at = datetime.utcnow()
            
            # Convert Pydantic model to dict for MongoDB
            repo_dict = git_repo.model_dump()
            
            # Use repo_hash as the unique identifier for upsert
            filter_query = {"repo_hash": git_repo.repo_hash}
            
            # Perform upsert operation
            result = await self.git_repos_collection.update_one(
                filter_query,
                {"$set": repo_dict},
                upsert=True
            )
            
            return {
                "upserted_id": str(result.upserted_id) if result.upserted_id else None,
            }
            
        except Exception as e:
            return {
                "error": str(e),
            }


    async def check_git_repo_updated(self, github_url: str) -> Dict[str, Any]:
        """
        Check if a GitRepoModel exists and if updated in the MongoDB git_repos collection.
        
        Args:
            github_url: GitHub repository URL to check
            
        Returns:
            Dict with keys:
                - exists: True if the repository exists, False otherwise
                - updated: True if the repository is updated, False otherwise
                - latest_commit_hash: fetched from github, return the latest_commit_hash
                
            
        """
        try:
            await self._ensure_indexes()
            # Normalize URL to canonical .git variant and compute repo_hash
            normalized_url = self._normalize_github_url(github_url)
            repo_hash = self._generate_repo_hash(normalized_url)
            
            # Fetch latest commit hash from GitHub unconditionally
            fetched_commit_hash = await self.get_latest_commit_hash(normalized_url)
            
            # Check if the repository exists
            filter_query = {"repo_hash": repo_hash}
            result = await self.git_repos_collection.find_one(filter_query)
    
            if not result:
                return {"exists": False, "updated": False, "latest_commit_hash": fetched_commit_hash}  # updated variable is same as up_to_date
    
            up_to_date = result["latest_commit_hash"] == fetched_commit_hash
            response = {"exists": True, "updated": up_to_date, "latest_commit_hash": fetched_commit_hash}
            return response
        
        except Exception as e:
            return {
                "error": str(e),
            }


    def clone_repo(self, github_url: str) -> Dict[str, Any]:
        """
        Ensure a GitHub repo is cloned to disk.

        Args:
            github_url: GitHub repository URL to clone

        Returns:
            Dict with keys: github_url, repo_name, repo_hash, local_path,
            or error key if failed
        """
        try:
            # Normalize URL to canonical .git variant and compute repo_hash
            normalized_url = self._normalize_github_url(github_url)
            repo_hash = self._generate_repo_hash(normalized_url)
            # Derive repo_name from URL
            repo_name = self._repo_name_from_url(normalized_url)

            # Resolve target_base fallback
            target_base: str = settings.PARENT_DIR

            # Determine destination path
            dest = os.path.join(target_base, repo_hash)

            # Create base directory if needed
            os.makedirs(target_base, exist_ok=True)

            # Clone repo if it doesn't exist
            if not os.path.exists(dest):
                try:
                    subprocess.run(["git", "clone", "--depth", "1", "--branch", "main", normalized_url, dest], check=True)
                except subprocess.CalledProcessError:
                    # If main branch doesn't exist, try master branch
                    subprocess.run(["git", "clone", "--depth", "1", "--branch", "master", normalized_url, dest], check=True)

            return {
                "repo_name": repo_name,
                "repo_hash": repo_hash,
                "local_path": dest,
            }

        except Exception as e:
            return {"error": str(e)}


    async def get_latest_commit_hash(self, github_url: str) -> str:
        """
        Return the latest commit SHA on the default branch (main or master) for a given GitHub repository URL.
        
        Args:
            github_url: GitHub repository URL

        Returns:
            Latest commit SHA on the default branch or None if failed
        """
        # Extract owner and repo from URL
        path_parts = urlparse(github_url).path.strip("/").split("/")

        owner, repo = path_parts[:2]
        # Handle URLs with .git suffix for API compatibility
        if repo.endswith(".git"):
            repo = repo[:-4]
        
        # Set headers to get only the commit SHA as plain text
        headers = {
            "Accept": "application/vnd.github.VERSION.sha"
        }
        
        # Try main branch first
        api_url = f"https://api.github.com/repos/{owner}/{repo}/commits/main"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(api_url, headers=headers)
            
            # If main branch doesn't exist (404), try master branch
            if response.status_code != 200:
                api_url = f"https://api.github.com/repos/{owner}/{repo}/commits/master"
                response = await client.get(api_url, headers=headers)
            
            response.raise_for_status()

            # Return the plain text SHA (strip whitespace)
            return response.text.strip()



    def upload_repo_s3(self, local_path: str, s3_key: str) -> Dict[str, Any]:
        """
        Upload a repository to S3 as a zip file.
        
        Checks if the file already exists in S3. If it exists, overwrites it.
        If it doesn't exist, creates a new file.
        
        Args:
            local_path: Local path to the repository to upload
            s3_key: S3 key (path) where the zip file will be stored
            
        Returns:
            Dict with keys:
                - overwritten: Boolean indicating if file was overwritten
                - error: error message if failed
        """
        try:
            # Check if file already exists in S3
            file_existed = False
            try:
                from utils.s3_utils import S3_BUCKET_NAME
                s3.head_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
                file_existed = True
            except s3.exceptions.ClientError as e:
                # File doesn't exist (404 error)
                if e.response['Error']['Code'] != '404':
                    # Some other error occurred
                    raise
            
            # Create a temporary zip file
            with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp_file:
                zip_file_path = tmp_file.name
            
            try:
                # Zip the repository folder
                zip_folder(local_path, zip_file_path)
                
                # Upload to S3 (this will overwrite if exists)
                _ = upload_file_to_s3(zip_file_path, s3_key)
                
                return {
                    "overwritten": file_existed,
                }
            finally:
                # Clean up temporary zip file
                if os.path.exists(zip_file_path):
                    os.remove(zip_file_path)
                    
        except Exception as e:
            return {"error": str(e)}


    async def get_existing_repo_by_hash(self, repo_hash: str) -> Dict[str, Any]:
        try:
            await self._ensure_indexes()
            filter_query = {"repo_hash": repo_hash}
            repo_doc = await self.git_repos_collection.find_one(filter_query)
            
            if not repo_doc:
                return {"error": f"Repository with repo_hash '{repo_hash}' not found"}
            
            # Remove MongoDB's _id field
            if '_id' in repo_doc:
                repo_doc.pop('_id')
            
            # Convert to GitRepoModel
            repo_model = GitRepoModel(**repo_doc)
            
            return repo_model.model_dump()
        except Exception as e:
            return {"error": str(e)}


    async def insert_role_hash(self, repo_model: GitRepoModel, filedir_path: str, filedir_hash: str, filedir_role: str) -> Dict[str, Any]:
        """
        Update both the hash and role for a file or directory in the repository's merkle tree.
        
        Args:
            repo_model: GitRepoModel object representing the repository
            filedir_path: Path of the file or directory within the merkle tree
            filedir_hash: New hash value to update
            filedir_role: Role description to set for the file/directory
            
        Returns:
            Dict with keys:
                - type: 'file' or 'directory'
                - error: Error message if failed
        """
        try:
            # Check if merkle_tree exists
            if not repo_model.merkle_tree:
                return {"error": "Repository does not have a merkle tree"}
            
            # Search for the file or directory in the merkle tree
            file_found = False
            dir_found = False
            
            # Search in files
            for file_record in repo_model.merkle_tree.files:
                if file_record.path == filedir_path:
                    # Update both hash and role
                    file_record.hash = filedir_hash
                    file_record.role = filedir_role
                    file_found = True
                    break
            
            # Search in directories if not found in files
            if not file_found:
                for dir_record in repo_model.merkle_tree.directories:
                    if dir_record.path == filedir_path:
                        # Update both hash and role
                        dir_record.hash = filedir_hash
                        dir_record.role = filedir_role
                        dir_found = True
                        break
            
            # Check if file/directory was found
            if not file_found and not dir_found:
                return {"error": f"File or directory with path '{filedir_path}' not found in merkle tree"}
            
            # Save the updated repo back to the database
            save_result = await self.save_git_repo_db(repo_model)
            if "error" in save_result:
                return save_result
            
            return {
                "type": "file" if file_found else "directory",
                "message": f"Hash and role updated successfully for {'file' if file_found else 'directory'} '{filedir_path}'"
            }
            
        except Exception as e:
            return {"error": f"Failed to insert file role: {str(e)}"}


    def _preserve_unchanged_roles(self, old_tree: MerkleTreeData, new_tree: MerkleTreeData, merkle_diff: Dict[str, Any]) -> None:
        """
        Preserve roles for unchanged files and directories when updating the merkle tree.
        Only updates the .role field; does not modify hashes or children.
        Does nothing if merkle_diff is None or improperly structured.
        """
        try:
            if not merkle_diff:
                return

            files_diff = merkle_diff.get("files") or {}
            dirs_diff = merkle_diff.get("directories") or {}

            # Build changed path sets
            changed_file_paths = set()
            for k in ("added", "modified", "removed"):
                items = files_diff.get(k) or []
                for it in items:
                    path = it.get("path")
                    if path:
                        changed_file_paths.add(path)

            changed_dir_paths = set()
            for k in ("added", "modified", "removed"):
                items = dirs_diff.get(k) or []
                for it in items:
                    path = it.get("path")
                    if path:
                        changed_dir_paths.add(path)

            # Map old roles
            old_file_roles = {record.path: record.role for record in (old_tree.files or [])}
            old_dir_roles = {record.path: record.role for record in (old_tree.directories or [])}

            preserved_files = 0
            preserved_dirs = 0

            # Preserve roles for files
            for record in (new_tree.files or []):
                if record.path not in changed_file_paths:
                    prev_role = old_file_roles.get(record.path)
                    if prev_role is not None:
                        record.role = prev_role
                        preserved_files += 1

            # Preserve roles for directories
            for record in (new_tree.directories or []):
                if record.path not in changed_dir_paths:
                    prev_role = old_dir_roles.get(record.path)
                    if prev_role is not None:
                        record.role = prev_role
                        preserved_dirs += 1

            logger_instance.info(f"Preserved roles - files: {preserved_files}, directories: {preserved_dirs}")
        except Exception as e:
            # Be safe: never block updates due to errors here
            logger_instance.error(f"_preserve_unchanged_roles skipped due to error: {e}")

    async def get_updated_repo_by_hash(self, repo_hash: str) -> Dict[str, Any]:
        """
        Get updated repository by comparing latest commit hash with stored version.
        
        If commits match: downloads S3 zip and extracts to local path
        If commits differ: clones fresh, computes merkle diff, updates S3 and DB
        
        Args:
            repo_hash: Repository hash identifier
            
        Returns:
            Dict with keys:
                - changed: bool indicating if repo was updated
                - merkle_diff: Dict with merkle tree differences (only if changed)
                - local_path: str path to extracted/cloned repo
                - repo_model: Dict of GitRepoModel document
                - error: str error message if failed
                - not_found: bool indicating if repo was not found
        """
        try:
            await self._ensure_indexes()
            # Fetch the repository document by repo_hash
            filter_query = {"repo_hash": repo_hash}
            repo_doc = await self.git_repos_collection.find_one(filter_query)
            
            if not repo_doc:
                return {"not_found": True}
            
            # Remove MongoDB's _id field
            if '_id' in repo_doc:
                repo_doc.pop('_id')
            
            # Convert to GitRepoModel
            repo_model = GitRepoModel(**repo_doc)
            
            # Get latest commit hash from GitHub
            normalized_url = self._normalize_github_url(repo_model.github_url)
            remote_latest_commit = await self.get_latest_commit_hash(normalized_url)
            
            if not remote_latest_commit:
                return {"error": "Failed to fetch latest commit hash from GitHub"}
            
            # Check if commits match
            if repo_model.latest_commit_hash == remote_latest_commit:
                # No changes - download from S3
                logger_instance.info(f"No changes detected for repo {repo_hash}. Downloading from S3...")
                
                # Determine local extraction path
                target_base = settings.PARENT_DIR
                local_path = os.path.join(target_base, repo_hash)
                
                # Create directory if needed
                os.makedirs(target_base, exist_ok=True)
                
                # Remove existing directory if present (to overwrite)
                if os.path.exists(local_path):
                    shutil.rmtree(local_path)
                
                # Download and extract from S3
                with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp_file:
                    zip_path = tmp_file.name
                
                try:
                    download_and_extract_zip(
                        key=repo_model.s3_key,
                        download_path=zip_path,
                        extract_to=local_path
                    )
                    
                    return {
                        "changed": False,
                        "local_path": local_path,
                        "repo_model": repo_model.model_dump()
                    }
                finally:
                    # Clean up temp zip file
                    if os.path.exists(zip_path):
                        os.remove(zip_path)
            
            else:
                # Commits differ - clone fresh and update
                logger_instance.info(f"Changes detected for repo {repo_hash}. Cloning fresh...")
                
                # Clone the repo
                clone_result = self.clone_repo(normalized_url)
                if "error" in clone_result:
                    return clone_result
                
                new_local_path = clone_result["local_path"]
                
                # Compute new merkle tree
                new_root_hash, new_file_records, new_dir_records = self.merkle_service.compute_merkle_tree(new_local_path)
                
                # Create new merkle tree data
                new_merkle_tree = MerkleTreeData(
                    root_hash=new_root_hash,
                    total_files=len(new_file_records),
                    total_directories=len(new_dir_records),
                    files=[MerkleFileRecord(**fr) for fr in new_file_records],
                    directories=[MerkleDirectoryRecord(**dr) for dr in new_dir_records]
                )
                
                # Compare merkle trees (if old tree exists)
                merkle_diff = None
                if repo_model.merkle_tree:
                    old_merkle_dict = repo_model.merkle_tree.model_dump()
                    new_merkle_dict = new_merkle_tree.model_dump()
                    merkle_diff = self.merkle_service.compare_merkle_trees(old_merkle_dict, new_merkle_dict)
                    logger_instance.info(f"Merkle diff computed: {merkle_diff['summary']}")
                else:
                    logger_instance.info("No previous merkle tree found - treating as initial upload")
                
                # Zip and upload to S3
                upload_result = self.upload_repo_s3(new_local_path, repo_model.s3_key)
                if "error" in upload_result:
                    return upload_result
                
                logger_instance.info(f"Uploaded to S3. Overwritten: {upload_result.get('overwritten', False)}")
                
                # Update repo model
                repo_model.latest_commit_hash = remote_latest_commit
                # Preserve roles for unchanged paths before replacing merkle tree
                if repo_model.merkle_tree and merkle_diff is not None:
                    self._preserve_unchanged_roles(repo_model.merkle_tree, new_merkle_tree, merkle_diff)
                repo_model.merkle_tree = new_merkle_tree
                repo_model.local_path = new_local_path
                repo_model.updated_at = datetime.utcnow()
                
                # Save updated model to DB
                save_result = await self.save_git_repo_db(repo_model)
                if "error" in save_result:
                    return save_result
                
                logger_instance.info(f"Repository {repo_hash} updated successfully")
                
                return {
                    "changed": True,
                    "merkle_diff": merkle_diff,
                    "local_path": new_local_path,
                    "repo_model": repo_model.model_dump()
                }
            
        except Exception as e:
            logger_instance.error(f"Failed to get updated repository: {str(e)}")
            return {"error": f"Failed to get updated repository: {str(e)}"}


    async def upsert_git_repo_model(self, github_url: str, repo_hash: str, repo_path: str, latest_commit_hash: str, file_roles: Dict[str, Any]) -> Dict[str, Any]:
        """
        Upsert a git repository model with merkle tree generation and file role assignment.
        
        Creates a new repository entry if it doesn't exist, or updates an existing one.
        Generates a complete merkle tree from the repository path and assigns roles to files/directories.
        
        Args:
            github_url: GitHub repository URL
            repo_hash: Repository hash identifier (unique)
            repo_path: Local path to the repository
            latest_commit_hash: Latest commit hash from GitHub
            file_roles: Dict of file roles in format "absolute_file_path": "role_description"
            
        Returns:
            Dict with keys:
                - upserted_repo: GitRepoModel inserted or updated
                - existed: Boolean indicating if repo existed before upsert
                - error: error message if failed
        """
        try:
            # Upload repository to S3
            s3_key = repo_hash
            upload_result = self.upload_repo_s3(repo_path, s3_key)
            if "error" in upload_result:
                logger_instance.error(f"Failed to upload repository to S3: {upload_result['error']}")
                
            
            logger_instance.info(f"Uploaded repository to S3 with key: {s3_key}")
            
            # Compute merkle tree
            root_hash, file_records, dir_records = self.merkle_service.compute_merkle_tree(repo_path)
            
            logger_instance.info(f"Generated merkle tree with root hash: {root_hash}")
            
            # Convert absolute paths in file_roles to relative paths
            role_map = {}
            for absolute_path, role in file_roles.items():
                # Convert absolute path to relative path (relative to repo_path)
                relative_path = os.path.relpath(absolute_path, repo_path)
                role_map[relative_path] = role
            
            logger_instance.info(f"Converted {len(role_map)} file role mappings from absolute to relative paths")
            
            # Create MerkleFileRecord instances with roles
            merkle_files = []
            for fr in file_records:
                file_path = fr["path"]
                role = role_map.get(file_path, None)
                merkle_files.append(MerkleFileRecord(
                    path=file_path,
                    hash=fr["hash"],
                    role=role
                ))
            
            # Create MerkleDirectoryRecord instances with roles
            merkle_dirs = []
            for dr in dir_records:
                dir_path = dr["path"]
                role = role_map.get(dir_path, None)
                merkle_dirs.append(MerkleDirectoryRecord(
                    path=dir_path,
                    hash=dr["hash"],
                    children=dr.get("children", []),
                    role=role
                ))
            
            # Create MerkleTreeData
            merkle_tree = MerkleTreeData(
                root_hash=root_hash,
                total_files=len(merkle_files),
                total_directories=len(merkle_dirs),
                files=merkle_files,
                directories=merkle_dirs
            )
            
            # Check if repository exists
            existing_repo = await self.git_repos_collection.find_one({"repo_hash": repo_hash})
            existed = existing_repo is not None
            
            # Derive repo_name from canonical github_url (.git enforced)
            normalized_github_url = self._normalize_github_url(github_url)
            repo_name = self._repo_name_from_url(normalized_github_url)
            
            # Create or update GitRepoModel
            git_repo = GitRepoModel(
                github_url=normalized_github_url,
                repo_hash=repo_hash,
                repo_name=repo_name,
                latest_commit_hash=latest_commit_hash,
                s3_key=s3_key,
                local_path=repo_path,
                merkle_tree=merkle_tree,
                created_at=existing_repo.get("created_at", datetime.utcnow()) if existed else datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Save to database (upsert operation)
            save_result = await self.save_git_repo_db(git_repo)
            if "error" in save_result:
                return save_result
            
            logger_instance.info(f"Repository {'updated' if existed else 'created'} successfully: {repo_hash}")
            
            return {
                "upserted_repo": git_repo,
                "existed": existed,
            }
            
        except Exception as e:
            logger_instance.error(f"Failed to upsert git repo model: {str(e)}")
            return {"error": f"Failed to upsert git repo model: {str(e)}"}


    async def update_git_repo_model(self, repo_path: str, new_repo_model: GitRepoModel, merkle_diff: Dict[str, Any], file_roles: Dict[str, str]) -> Dict[str, Any]:
        """
        Update an existing repository model with new merkle tree data and file roles.
        
        Takes a new repository model (from get_updated_repo_by_hash), merkle diff data,
        and file roles to update the repository document in the database.
        
        Args:
            repo_path: Local path to the repository (needed to convert absolute to relative paths)
            new_repo_model: GitRepoModel with updated merkle tree data
            merkle_diff: Dictionary containing merkle tree differences (from compare_merkle_trees)
            file_roles: Dict mapping absolute file/directory paths to their role descriptions
            
        Returns:
            Dict with keys:
                - success: Boolean indicating if update was successful
                - updated_count: Number of files/directories that had roles updated
                - message: Success message
                - error: error message if failed
        """
        try:
            # Check if merkle_tree exists in new_repo_model
            if not new_repo_model.merkle_tree:
                return {"error": "Repository model does not have a merkle tree"}
            
            # Convert absolute paths in file_roles to relative paths
            role_map = {}
            for absolute_path, role in file_roles.items():
                # Convert absolute path to relative path (relative to repo_path)
                relative_path = os.path.relpath(absolute_path, repo_path)
                role_map[relative_path] = role
            
            logger_instance.info(f"Converted {len(role_map)} file role mappings from absolute to relative paths")
            
            updated_count = 0

            # Derive changed paths from merkle_diff; restrict role updates to changed/new paths
            changed_file_paths = None
            changed_dir_paths = None
            if merkle_diff:
                files_diff = merkle_diff.get("files") or {}
                dirs_diff = merkle_diff.get("directories") or {}

                changed_file_paths = set()
                for k in ("added", "modified"):
                    for item in files_diff.get(k, []):
                        p = item.get("path")
                        if p:
                            changed_file_paths.add(p)

                changed_dir_paths = set()
                for k in ("added", "modified"):
                    for item in dirs_diff.get(k, []):
                        p = item.get("path")
                        if p:
                            changed_dir_paths.add(p)
            
            # Update roles for files (only for changed/new paths unless merkle_diff is None)
            for file_record in new_repo_model.merkle_tree.files:
                if (
                    file_record.path in role_map
                    and (changed_file_paths is None or file_record.path in changed_file_paths)
                ):
                    file_record.role = role_map[file_record.path]
                    updated_count += 1
            
            # Update roles for directories (only for changed/new paths unless merkle_diff is None)
            for dir_record in new_repo_model.merkle_tree.directories:
                if (
                    dir_record.path in role_map
                    and (changed_dir_paths is None or dir_record.path in changed_dir_paths)
                ):
                    dir_record.role = role_map[dir_record.path]
                    updated_count += 1
            
            # Update the updated_at timestamp
            new_repo_model.updated_at = datetime.utcnow()
            
            # Save the updated model to database
            save_result = await self.save_git_repo_db(new_repo_model)
            if "error" in save_result:
                return save_result
            
            logger_instance.info(
                f"Repository {new_repo_model.repo_hash} updated with {updated_count} role assignments"
            )
            
            return {
                "success": True,
                "updated_repo_model": new_repo_model,
                "message": f"Repository updated successfully with {updated_count} role assignments"
            }
            
        except Exception as e:
            logger_instance.error(f"Failed to update git repo model: {str(e)}")
            return {"error": f"Failed to update git repo model: {str(e)}"}

    def get_all_role_map(self, repo_model: GitRepoModel, repo_path: str) -> Dict[str, str]:
        """
        Aggregate roles for all files and directories from the repository's merkle tree.

        Args:
            repo_model: GitRepoModel for the repository
            repo_path: Absolute path to the repository root

        Returns:
            Dict mapping absolute paths to role strings for all entries where role is not None.
        """
        try:
            # Allow passing of either a model instance or a dict
            if isinstance(repo_model, dict):
                try:
                    repo_model = GitRepoModel(**repo_model)
                except Exception as e:
                    logger_instance.error(f"get_all_role_map: could not coerce dict to GitRepoModel: {e}")
                    return {}

            if not repo_model or not repo_model.merkle_tree:
                logger_instance.info("Aggregated roles - files: 0, directories: 0 (no merkle tree)")
                return {}

            roles: Dict[str, str] = {}
            file_count = 0
            dir_count = 0

            for record in (repo_model.merkle_tree.files or []):
                if record.role is not None:
                    abs_path = os.path.normpath(os.path.join(repo_path, record.path))
                    roles[abs_path] = record.role
                    file_count += 1

            for record in (repo_model.merkle_tree.directories or []):
                if record.role is not None:
                    abs_path = os.path.normpath(os.path.join(repo_path, record.path))
                    roles[abs_path] = record.role
                    dir_count += 1

            logger_instance.info(f"Aggregated roles - files: {file_count}, directories: {dir_count}")
            return roles
        except Exception as e:
            logger_instance.error(f"get_all_role_map encountered error: {e}")
            return {}
