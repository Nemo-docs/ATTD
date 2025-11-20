"""Service layer for managing anonymous user records."""

from typing import Optional

from pymongo.asynchronous.collection import AsyncCollection
from pymongo.errors import PyMongoError

from core.clients import mongodb_client
from core.config import settings
from core.logger import logger_instance
from .models import UserModel


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
        if not document:
            return None

        document.pop("_id", None)
        return UserModel(**document)

    async def _require_user(self, user_id: str) -> UserModel:
        """Fetch and return a user, raising if it does not exist."""

        user = await self._find_user(user_id)
        if user is None:
            raise ValueError(f"User {user_id} not found")
        return user
