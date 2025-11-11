import hashlib
import os
import subprocess
from dotenv import load_dotenv
from app.modules.auto_generation.service import AutoGenerationService
import logging
from utils.s3_utils import zip_folder, upload_file_to_s3

load_dotenv()


class GitRepoSetupService:
    def __init__(self):
        self.auto_generation_service = AutoGenerationService()
        self.logger = logging.getLogger(__name__)

    def _generate_repo_hash(self, github_url: str) -> str:
        return hashlib.sha256(github_url.encode()).hexdigest()

    def _repo_name_from_url(self, github_url: str) -> str:
        return github_url.split("/")[-1].replace(".git", "")

    def clone_repo_to_disk(
        self, github_url: str, target_base: str = os.getenv("PARENT_DIR")
    ) -> str:
        """Clone the github repo to a local directory and return the path.

        Raises subprocess.CalledProcessError on failure.
        """
        try:
            self.logger.info(f"Cloning repo to disk: {github_url}")
            repo_hash = self._generate_repo_hash(github_url)
            dest = os.path.join(target_base, repo_hash)
            os.makedirs(target_base, exist_ok=True)
            # checking in db if the repo already exists
            repo_intro = self.auto_generation_service.get_project_intro_by_hash(
                repo_hash
            )
            if repo_intro is not None:
                return repo_intro

            if os.path.exists(dest):
                # If the repo already exists on disk, return the stored/generated
                # project metadata from the auto-generation service so the API
                # response matches the expected response model.
                self.logger.info(f"Repo already exists on disk: {dest}")
                repo_intro = self.auto_generation_service.get_project_intro_by_hash(
                    repo_hash
                )

                if repo_intro is None:
                    # If no stored intro exists, attempt to (re)generate it.
                    self.logger.info(f"Generating new intro for repo: {repo_hash}")
                    repo_intro = self.auto_generation_service.generate_intro(
                        github_url=str(github_url),
                        repo_hash=repo_hash,
                        name=self._repo_name_from_url(str(github_url)),
                    )

                return repo_intro

            # Run git clone
            self.logger.info(f"Cloning repo to disk: {github_url}")
            subprocess.run(["git", "clone", github_url, dest], check=True)

            # zip the repo and upload to s3
            zip_file_path = zip_folder(dest, f"{repo_hash}.zip")
            upload_file_to_s3(zip_file_path, f"{repo_hash}")

            # generate intro and save to db
            self.logger.info(f"Generating new intro for repo: {repo_hash}")
            result = self.auto_generation_service.generate_intro(
                github_url=str(github_url),
                repo_hash=repo_hash,
                name=self._repo_name_from_url(str(github_url)),
            )

            return result
        except Exception as e:
            return {"error": str(e)}

    def get_repo_by_hash(self, repo_hash: str):
        """
        Retrieve repo metadata (generated intro) by its hash.

        Returns a dict with repo data or an error dict.
        """
        try:
            self.logger.info(f"Retrieving repo data for hash: {repo_hash}")
            repo_intro = self.auto_generation_service.get_project_intro_by_hash(
                repo_hash
            )

            if repo_intro is None:
                return {"error": f"No repo data found for hash: {repo_hash}"}

            return repo_intro
        except Exception as e:
            self.logger.error(f"Error in get_repo_by_hash: {str(e)}")
            return {"error": str(e)}
