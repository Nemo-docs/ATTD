import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

from clients import mongodb_client
from .models import SnippetModel, SnippetsModel


class SnippetManagementService:
    """
    Service for managing snippets and snippet collections.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        # Database setup
        self.db_name = os.getenv("MONGODB_DATABASE", "attd_db")
        self.snippets_collection_name = os.getenv("MONGODB_COLLECTION_SNIPPETS", "snippets")
        self.collections_collection_name = os.getenv("MONGODB_COLLECTION_SNIPPETS_COLLECTIONS", "snippets_collections")
        self.db = mongodb_client[self.db_name]
        self.snippets: Collection = self.db[self.snippets_collection_name]
        self.collections: Collection = self.db[self.collections_collection_name]

        # Create useful indexes
        try:
            self.snippets.create_index("id", unique=True)
            self.snippets.create_index([("user_id", 1), ("created_at", -1)])
            self.collections.create_index("user_id", unique=True)
            self.logger.info("Created indexes for snippets module")
        except PyMongoError as e:
            self.logger.warning(f"Could not create index: {e}")

    def create_snippet(self, user_id: str, content: str, tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Create a new snippet and add its id to the user's snippets collection.
        """
        try:
            if not user_id:
                return {"error": "user_id is required"}

            snippet_model = SnippetModel(user_id=user_id, content=content, tags=tags or [])
            snippet_data = snippet_model.dict()

            saved = self._save_snippet(snippet_data)
            if not saved:
                return {"error": "Failed to save snippet"}

            # Add the id to user's snippets collection (upsert)
            self._add_snippet_to_collection(user_id, snippet_model.id)

            return {"snippet": snippet_model, "message": "Snippet created successfully"}

        except Exception as e:
            self.logger.error(f"Error creating snippet: {e}")
            return {"error": str(e)}

    def get_snippet(self, snippet_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        try:
            if not snippet_id:
                return None
            return self._get_snippet(snippet_id, user_id=user_id)
        except Exception as e:
            self.logger.error(f"Error retrieving snippet: {e}")
            return {"error": str(e)}

    def get_all_snippets(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        try:
            if not user_id:
                return {"error": "user_id is required"}

            snippets_data = self._get_all_snippets(user_id=user_id)
            snippets = []
            for s in snippets_data:
                try:
                    snippets.append(SnippetModel(**s))
                except Exception as e:
                    self.logger.warning(f"Error converting snippet data: {e}")
                    continue

            return {"snippets": snippets, "total_count": len(snippets)}
        except Exception as e:
            self.logger.error(f"Error retrieving all snippets: {e}")
            return {"error": str(e)}

    def update_snippet(self, snippet_id: str, user_id: str, content: Optional[str] = None, tags: Optional[List[str]] = None, add_tags: Optional[List[str]] = None) -> Dict[str, Any]:
        try:
            if not user_id:
                return {"error": "user_id is required"}

            existing = self._get_snippet(snippet_id, user_id=user_id)
            if not existing:
                return {"error": f"Snippet with ID {snippet_id} not found"}

            update_data: Dict[str, Any] = {}
            if content is not None:
                update_data["content"] = content
            if tags is not None:
                update_data["tags"] = tags
            if add_tags:
                existing_tags = existing.get("tags", []) or []
                # avoid duplicates
                merged = existing_tags + [t for t in add_tags if t not in existing_tags]
                update_data["tags"] = merged

            update_data["updated_at"] = datetime.utcnow()

            success = self._update_snippet(snippet_id, user_id, update_data)
            if not success:
                return {"error": "Failed to update snippet"}

            updated = self._get_snippet(snippet_id, user_id=user_id)
            if updated:
                return {"snippet": SnippetModel(**updated), "message": "Snippet updated successfully"}
            else:
                return {"error": "Failed to fetch updated snippet"}

        except Exception as e:
            self.logger.error(f"Error updating snippet: {e}")
            return {"error": str(e)}

    def delete_snippet(self, snippet_id: str, user_id: str) -> Dict[str, Any]:
        try:
            if not user_id:
                return {"error": "user_id is required"}

            existing = self._get_snippet(snippet_id, user_id=user_id)
            if not existing:
                return {"error": f"Snippet with ID {snippet_id} not found"}

            success = self._delete_snippet(snippet_id, user_id)
            if not success:
                return {"error": "Failed to delete snippet"}

            # remove from collection
            self._remove_snippet_from_collection(user_id, snippet_id)

            return {"message": "Snippet deleted successfully", "deleted_snippet_id": snippet_id}

        except Exception as e:
            self.logger.error(f"Error deleting snippet: {e}")
            return {"error": str(e)}

    # --- Database helper methods ---
    def _save_snippet(self, snippet_data: Dict[str, Any]) -> bool:
        try:
            snippet_data["created_at"] = datetime.utcnow()
            snippet_data["updated_at"] = datetime.utcnow()
            result = self.snippets.replace_one({"id": snippet_data["id"]}, snippet_data, upsert=True)
            if result.upserted_id or result.modified_count > 0:
                return True
            return False
        except PyMongoError as e:
            self.logger.error(f"Error saving snippet: {e}")
            raise e

    def _get_snippet(self, snippet_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        try:
            query = {"id": snippet_id}
            if user_id:
                query["user_id"] = user_id

            result = self.snippets.find_one(query)
            if not result and user_id:
                fallback = self.snippets.find_one({"id": snippet_id, "user_id": {"$exists": False}})
                if fallback:
                    self.snippets.update_one({"_id": fallback["_id"]}, {"$set": {"user_id": user_id}})
                    fallback["user_id"] = user_id
                    result = fallback

            if result:
                result.pop("_id", None)
                if user_id and not result.get("user_id"):
                    result["user_id"] = user_id
                return result
            return None
        except PyMongoError as e:
            self.logger.error(f"Error retrieving snippet: {e}")
            raise e

    def _get_all_snippets(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            query = {}
            if user_id:
                query = {"$or": [{"user_id": user_id}, {"user_id": {"$exists": False}}]}

            cursor = self.snippets.find(query).sort("created_at", -1)
            snippets = list(cursor)
            for s in snippets:
                s.pop("_id", None)
                if user_id and not s.get("user_id"):
                    s["user_id"] = user_id
            return snippets
        except PyMongoError as e:
            self.logger.error(f"Error retrieving snippets: {e}")
            raise e

    def _update_snippet(self, snippet_id: str, user_id: str, update_data: Dict[str, Any]) -> bool:
        try:
            result = self.snippets.update_one({"id": snippet_id, "user_id": user_id}, {"$set": update_data})
            if result.modified_count == 0 and user_id:
                result = self.snippets.update_one({"id": snippet_id, "user_id": {"$exists": False}}, {"$set": {**update_data, "user_id": user_id}})
            return result.modified_count > 0
        except PyMongoError as e:
            self.logger.error(f"Error updating snippet: {e}")
            raise e

    def _delete_snippet(self, snippet_id: str, user_id: str) -> bool:
        try:
            result = self.snippets.delete_one({"id": snippet_id, "user_id": user_id})
            if result.deleted_count == 0 and user_id:
                result = self.snippets.delete_one({"id": snippet_id, "user_id": {"$exists": False}})
            return result.deleted_count > 0
        except PyMongoError as e:
            self.logger.error(f"Error deleting snippet: {e}")
            raise e

    # --- Collection helpers ---
    def _add_snippet_to_collection(self, user_id: str, snippet_id: str) -> None:
        try:
            now = datetime.utcnow()
            self.collections.update_one(
                {"user_id": user_id},
                {"$addToSet": {"snippet_ids": snippet_id}, "$set": {"updated_at": now}},
                upsert=True,
            )
        except PyMongoError as e:
            self.logger.error(f"Error adding snippet id to collection: {e}")
            raise e

    def _remove_snippet_from_collection(self, user_id: str, snippet_id: str) -> None:
        try:
            now = datetime.utcnow()
            self.collections.update_one(
                {"user_id": user_id},
                {"$pull": {"snippet_ids": snippet_id}, "$set": {"updated_at": now}},
            )
        except PyMongoError as e:
            self.logger.error(f"Error removing snippet id from collection: {e}")
            raise e

    def ensure_collection(self, user_id: str) -> Dict[str, Any]:
        """
        Ensure a snippets collection document exists for the user.
        Creates an empty collection record if none exists.
        """
        try:
            if not user_id:
                return {"error": "user_id is required"}

            now = datetime.utcnow()
            self.collections.update_one(
                {"user_id": user_id},
                {"$setOnInsert": {"snippet_ids": [], "created_at": now}, "$set": {"updated_at": now}},
                upsert=True,
            )
            return {"message": "Snippets collection ensured"}
        except Exception as e:
            self.logger.error(f"Error ensuring collection: {e}")
            return {"error": str(e)}


