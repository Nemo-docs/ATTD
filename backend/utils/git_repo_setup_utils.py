import subprocess
import os
import shutil
import stat
from core.config import settings
from core.logger import logger_instance




def remove_readonly(func, path, excinfo):
    """
    Error handler for ``shutil.rmtree``.

    If the error is due to an access error (read only file)
    it attempts to add write permission and then retries.

    If the error is for another reason it re-raises the error.

    Usage : ``shutil.rmtree(path, onerror=remove_readonly)``
    """
    # Clear the readonly bit and reattempt the removal
    os.chmod(path, stat.S_IWRITE)
    func(path)


def git_clone_files(repo_hash:str, random_id: str, github_url: str):
    try:
        # make dir
        dest = settings.PARENT_DIR + "/" + repo_hash + "/" + random_id
        parent_dir = os.path.dirname(dest)
        logger_instance.info(f"Creating parent directory at: {parent_dir}")
        os.makedirs(parent_dir, exist_ok=True)

        if os.path.exists(dest):
            logger_instance.warning(f"Destination directory already exists: {dest}. Removing it.")
            shutil.rmtree(dest, onerror=remove_readonly)
        logger_instance.info(f"Cloning repo to disk: {github_url} to {dest}")
        result = subprocess.run(["git", "clone", github_url, dest], capture_output=True, text=True, check=True)
        logger_instance.info(f"Git clone stdout: {result.stdout}")
        if result.stderr:
            logger_instance.warning(f"Git clone stderr: {result.stderr}")
    except subprocess.CalledProcessError as e:
        logger_instance.error(f"Git clone failed with exit code {e.returncode}. Stdout: {e.stdout}. Stderr: {e.stderr}")
        raise e
    except Exception as e:
        logger_instance.error(f"Error cloning repo: {e}")
        raise e

def remove_cloned_files(repo_hash:str, random_id:str):
    try:
        dest = settings.PARENT_DIR + "/" + repo_hash + "/" + random_id + "/"
        logger_instance.info(f"Removing git files from: {dest}")
        shutil.rmtree(dest, onerror=remove_readonly)
    except Exception as e:
        logger_instance.error(f"Error removing git files: {e}")
        raise e