import subprocess
from dotenv import load_dotenv
import os
import logging
import shutil
load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def git_clone_files(repo_hash:str, random_id: str, github_url: str):
    try:
        # make dir
        path = os.getenv("PARENT_DIR") + "/" + repo_hash + "/" + random_id + "/"
        os.makedirs(path, exist_ok=True)
        dest = path
        logger.info(f"Cloning repo to disk: {github_url} to {dest}")
        subprocess.run(["git", "clone", github_url, dest], check=True)
    except Exception as e:
        logger.error(f"Error cloning repo: {e}")
        raise e

def remove_cloned_files(repo_hash:str, random_id:str):
    try:
        dest = os.getenv("PARENT_DIR") + "/" + repo_hash + "/" + random_id + "/"
        logger.info(f"Removing git files from: {dest}")
        shutil.rmtree(dest)
    except Exception as e:
        logger.error(f"Error removing git files: {e}")
        raise e