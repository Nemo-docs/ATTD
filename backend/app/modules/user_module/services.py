"""Service layer for managing anonymous user records."""

import logging
import os
from datetime import datetime
from typing import Any, Dict, Optional

from pymongo.collection import Collection
from pymongo.errors import PyMongoError

from clients import mongodb_client
from .models import UserModel


class UserService:
    """Provides persistence helpers for the user module."""

    def __init__(self) -> None:
        """Initialise database handles and indexes."""

        self.logger = logging.getLogger(__name__)
        database_name = os.getenv("MONGODB_DATABASE", "attd_db")
        collection_name = os.getenv("MONGODB_COLLECTION_USERS", "users")
        database = mongodb_client[database_name]
        self.collection: Collection = database[collection_name]

        try:
            self.collection.create_index("user_id", unique=True)
        except PyMongoError as exc:
            self.logger.warning("Could not ensure unique index on user_id: %s", exc)

    def ensure_user(self, user_id: str) -> UserModel:
        """Return the user if it exists or create a new record."""

        existing_user = self._find_user(user_id)
        if existing_user:
            return existing_user

        user_model = UserModel(user_id=user_id)
        try:
            self.collection.insert_one(user_model.dict())
        except PyMongoError as exc:
            self.logger.error("Failed to insert user %s: %s", user_id, exc)
            raise

        return user_model

    def get_user(self, user_id: str) -> Optional[UserModel]:
        """Retrieve a user record by identifier."""

        try:
            return self._find_user(user_id)
        except PyMongoError as exc:
            self.logger.error("Failed to fetch user %s: %s", user_id, exc)
            raise

    def _find_user(self, user_id: str) -> Optional[UserModel]:
        """Fetch a user document from the database."""

        document = self.collection.find_one({"user_id": user_id})
        if not document:
            return None

        document.pop("_id", None)
        return UserModel(**document)

    def _require_user(self, user_id: str) -> UserModel:
        """Fetch and return a user, raising if it does not exist."""

        user = self._find_user(user_id)
        if user is None:
            raise ValueError(f"User {user_id} not found")
        return user
