import boto3
import zipfile
import os
from core.config import settings


S3_BUCKET_NAME = settings.S3_BUCKET_NAME
AWS_ACCESS_KEY_ID = settings.AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY = settings.AWS_SECRET_ACCESS_KEY
AWS_REGION = settings.AWS_REGION

s3 = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)


def upload_file_to_s3(zip_file_path: str, key: str):
    s3.upload_file(zip_file_path, S3_BUCKET_NAME, key)
    return f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{key}"


def download_and_extract_zip(key: str, download_path: str, extract_to: str):
    s3.download_file(S3_BUCKET_NAME, key, download_path)
    with zipfile.ZipFile(download_path, "r") as zip_ref:
        zip_ref.extractall(extract_to)


def zip_folder(folder_path: str, zip_file_path: str):
    with zipfile.ZipFile(zip_file_path, "w") as zipf:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                zipf.write(
                    os.path.join(root, file),
                    os.path.relpath(os.path.join(root, file), folder_path),
                )
    return zip_file_path
