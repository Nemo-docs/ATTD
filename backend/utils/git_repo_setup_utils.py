import subprocess
import os
import shutil
from core.config import settings
from core.log_util import logger_instance




def git_clone_files(repo_hash:str, random_id: str, github_url: str):
    try:
        # make dir
        path = settings.PARENT_DIR + "/" + repo_hash + "/" + random_id + "/"
        os.makedirs(path, exist_ok=True)
        dest = path
        logger_instance.info(f"Cloning repo to disk: {github_url} to {dest}")
        subprocess.run(["git", "clone", github_url, dest], check=True)
    except Exception as e:
        logger_instance.error(f"Error cloning repo: {e}")
        raise e

def remove_cloned_files(repo_hash:str, random_id:str):
    try:
        dest = settings.PARENT_DIR + "/" + repo_hash + "/" + random_id + "/"
        logger_instance.info(f"Removing git files from: {dest}")
        shutil.rmtree(dest)
    except Exception as e:
        logger_instance.error(f"Error removing git files: {e}")
        raise e