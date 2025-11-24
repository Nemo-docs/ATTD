"""Service layer for managing anonymous user records."""

from typing import Optional
from typing_extensions import List

from pymongo.asynchronous.collection import AsyncCollection
from pymongo.errors import PyMongoError

from core.clients import mongodb_client
from core.config import settings
from core.logger import logger_instance
from .models import UserModel, RepoInfoModel


class UserService:
    """Provides persistence helpers for the user module."""

    def __init__(self) -> None:
        """Initialise database handles and indexes."""

        self.logger = logger_instance
        database_name = settings.DB_NAME
        collection_name = "users"
        database = mongodb_client[database_name]
        self.collection: AsyncCollection = database[collection_name]
        self._indexes_created = False

    async def _ensure_indexes(self) -> None:
        """Ensure indexes exist. Called lazily on first DB operation."""
        if not self._indexes_created:
            try:
                await self.collection.create_index("user_id", unique=True)
                self.logger.info("Created unique index on user_id")
                self._indexes_created = True
            except PyMongoError as exc:
                self.logger.error("Could not ensure unique index on user_id: %s", exc)

    async def ensure_user(self, user_id: str) -> UserModel:
        """Return the user if it exists or create a new record."""
        await self._ensure_indexes()

        existing_user = await self._find_user(user_id)
        if existing_user:
            return existing_user

        user_model = UserModel(user_id=user_id)
        try:
            await self.collection.insert_one(user_model.dict())
        except PyMongoError as exc:
            self.logger.error("Failed to insert user %s: %s", user_id, exc)
            raise

        return user_model

    async def get_user(self, user_id: str) -> Optional[UserModel]:
        """Retrieve a user record by identifier."""
        await self._ensure_indexes()

        try:
            return await self._find_user(user_id)
        except PyMongoError as exc:
            self.logger.error("Failed to fetch user %s: %s", user_id, exc)
            raise

    async def _find_user(self, user_id: str) -> Optional[UserModel]:
        """Fetch a user document from the database."""

        document = await self.collection.find_one({"user_id": user_id})
        # create a new user if not exists
        if not document:
            try:
                user = UserModel(user_id=user_id)
                await self.collection.insert_one(user.dict())
                return user
            except Exception as e:
                self.logger.error("Failed to create user %s: %s", user_id, e)
                raise e

        document.pop("_id", None)
        return UserModel(**document)

    async def _require_user(self, user_id: str) -> UserModel:
        """Fetch and return a user, raising if it does not exist."""

        user = await self._find_user(user_id)
        if user is None:
            raise ValueError(f"User {user_id} not found")
        return user

    async def add_repo_info(self, user_id: str, repo_hash: str, repo_name: str, repo_url: str) -> bool:
        """Add repository information to the user's record."""
        try:
            # await self._ensure_indexes()
            # check form DB if not exists, create a new one
            user = await self._find_user(user_id)
            # check if repo_hash already exists
            for repo_info in user.repo_infos:
                if repo_info.repo_hash == repo_hash:
                    raise ValueError(f"Repository {repo_hash} already exists")
            # add new repo_info
            user.repo_infos.append(RepoInfoModel(repo_hash=repo_hash, repo_name=repo_name, repo_url=repo_url))
            await self.collection.update_one({"user_id": user_id}, {"$set": user.dict()})
            return True
        except Exception as e:
            self.logger.error("Failed to add repository information to user %s: %s", user_id, e)
            raise e

    async def get_user_added_repo_infos(self, user_id: str) -> Optional[List[RepoInfoModel]]:
        """Get repository information for a user."""
        try:
            user = await self._find_user(user_id)
            return user.repo_infos if user and user.repo_infos else []
        except Exception as e:
            self.logger.error("Failed to get repository information for user %s: %s", user_id, e)
            raise e

    async def remove_repo_info(self, user_id: str, repo_hash: str) -> bool:
        """Remove repository information from the user's record."""
        try:
            user = await self._find_user(user_id)
            if not user or not user.repo_infos:
                self.logger.warning(f"No repo infos found for user {user_id}")
                return False

            initial_count = len(user.repo_infos)
            user.repo_infos = [ri for ri in user.repo_infos if ri.repo_hash != repo_hash]

            if len(user.repo_infos) == initial_count:
                self.logger.warning(f"Repo {repo_hash} not found for user {user_id}")
                return False

            # Update only repo_infos field
            await self.collection.update_one(
                {"user_id": user_id},
                {"$set": {"repo_infos": [ri.dict() for ri in user.repo_infos]}}
            )
            self.logger.info(f"Removed repo {repo_hash} for user {user_id}")
            return True
        except Exception as e:
            self.logger.error("Failed to remove repository information for user %s: %s", user_id, e)
            raise e