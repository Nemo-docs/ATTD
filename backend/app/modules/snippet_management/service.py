from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

from core.clients import mongodb_client
from core.config import settings
from core.log_util import logger_instance
from .models import SnippetModel


class SnippetManagementService:
    """
    Service for managing snippets and snippet collections.
    """

    def __init__(self):
        self.logger = logger_instance

        # Database setup
        self.db_name = settings.DB_NAME
        self.snippets_collection_name = "snippets"
        self.collections_collection_name = "snippets_collections"
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
            self.logger.error(f"Could not create index: {e}")

    def create_snippet(self, user_id: str, content: str, tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Create a new snippet and add its id to the user's snippets collection.
        """
        try:
            if not user_id:
                return {"error": "user_id is required"}

            snippet_model = SnippetModel(user_id=user_id, content=content, tags=tags or [])
            now = self._current_iso_timestamp()
            snippet_model.created_at = now
            snippet_model.updated_at = now
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
                    self.logger.error(f"Error converting snippet data: {e}")
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

            update_data["updated_at"] = self._current_iso_timestamp()

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
            success = self._add_deleted_snippet_to_collection(user_id, snippet_id)
            if not success:
                return {"error": "Failed to add deleted snippet id to collection"}

            return {"message": "Snippet deleted successfully", "deleted_snippet_id": snippet_id}

        except Exception as e:
            self.logger.error(f"Error deleting snippet: {e}")
            return {"error": str(e)}

    def sync_snippets(self, user_id: str, local_snippets: List[Dict[str, Any]], client_last_edit_unix: Optional[int] = None) -> Dict[str, Any]:
        """
        Merge local snippets into the user's cloud collection without overwriting existing records.
        """
        try:
            if not user_id:
                return {"error": "user_id is required"}

            self.ensure_collection(user_id)
            server_last_unix = self._get_collection_last_unix(user_id)
            current_snippets = self._get_all_snippets(user_id=user_id)
            existing_ids: Set[str] = {snippet["id"] for snippet in current_snippets}

            # remove deleted snippets from local snippets
            deleted_snippet_ids = self._get_deleted_snippet_ids(user_id)
            local_snippets = [snippet for snippet in local_snippets if snippet.get("id") not in deleted_snippet_ids]
            created_ids = self._merge_local_snapshots(user_id, local_snippets, existing_ids)
            merged_snippets = self._get_all_snippets(user_id=user_id)
            # last_unix_timestamp = self._derive_last_unix_timestamp(
            #     merged_snippets, server_last_unix, client_last_edit_unix
            # )
            now = datetime.now(timezone.utc)
            last_unix_timestamp = int(now.timestamp())
            # print("last_unix_timestamp", last_unix_timestamp)
            self._set_collection_last_unix(user_id, last_unix_timestamp)

            was_changed = bool(created_ids) or (client_last_edit_unix or 0) != last_unix_timestamp
            message = "Snippets merged successfully" if was_changed else "Snippets already synced"

            return {
                "message": message,
                "snippets": [SnippetModel(**snippet) for snippet in merged_snippets],
                "last_unix_timestamp": last_unix_timestamp,
                "was_changed": was_changed,
            }
        except Exception as e:
            self.logger.error(f"Error syncing snippets: {e}")
            return {"error": str(e)}

    def get_sync_status(self, user_id: str) -> Dict[str, Any]:
        """
        Return the server's last sync timestamp and snippet count for the user.
        """
        try:
            if not user_id:
                return {"error": "user_id is required"}

            self.ensure_collection(user_id)
            last_unix_timestamp = self._get_collection_last_unix(user_id)
            query = {"$or": [{"user_id": user_id}, {"user_id": {"$exists": False}}]}
            total_count = self.snippets.count_documents(query)
            # print("last_unix_timestamp from get_sync_status()", last_unix_timestamp)
            return {"last_unix_timestamp": last_unix_timestamp, "total_count": total_count}
        except Exception as e:
            self.logger.error(f"Error retrieving sync status: {e}")
            return {"error": str(e)}

    # --- Database helper methods ---
    def _save_snippet(self, snippet_data: Dict[str, Any]) -> bool:
        try:
            now = self._current_iso_timestamp()
            snippet_data["created_at"] = now
            snippet_data["updated_at"] = now
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

    def _get_deleted_snippet_ids(self, user_id: str) -> List[str]:
        try:
            result = self.collections.find_one({"user_id": user_id}, {"deleted_snippet_ids": 1})
            return result.get("deleted_snippet_ids", [])
        except PyMongoError as e:
            self.logger.error(f"Error getting deleted snippet ids: {e}")
            raise e

    def _add_deleted_snippet_to_collection(self, user_id: str, snippet_id: str):
        try:
            self.collections.update_one({"user_id": user_id}, {"$addToSet": {"deleted_snippet_ids": snippet_id}})
            return True
        except PyMongoError as e:
            self.logger.error(f"Error adding deleted snippet id to collection: {e}")
            raise e


    # --- Collection helpers ---
    def _add_snippet_to_collection(self, user_id: str, snippet_id: str) -> None:
        try:
            now = datetime.utcnow()
            last_unix_timestamp = int(now.timestamp())
            self.collections.update_one(
                {"user_id": user_id},
                {
                    "$addToSet": {"snippet_ids": snippet_id},
                    "$set": {"updated_at": now, "last_unix_timestamp": last_unix_timestamp},
                },
                upsert=True,
            )
        except PyMongoError as e:
            self.logger.error(f"Error adding snippet id to collection: {e}")
            raise e

    def _remove_snippet_from_collection(self, user_id: str, snippet_id: str) -> None:
        try:
            now = datetime.utcnow()
            last_unix_timestamp = int(now.timestamp())
            self.collections.update_one(
                {"user_id": user_id},
                {
                    "$pull": {"snippet_ids": snippet_id},
                    "$set": {"updated_at": now, "last_unix_timestamp": last_unix_timestamp},
                },
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
            if self.collections.find_one({"user_id": user_id}):
                return {"message": "Snippets collection already exists"}
            now = datetime.now(timezone.utc)
            last_unix_timestamp = int(now.timestamp())
            self.collections.insert_one({
                "user_id": user_id,
                "snippet_ids": [],
                "created_at": now,
                "updated_at": now,
                "last_unix_timestamp": last_unix_timestamp,
            })
            return {"message": "Snippets collection ensured"}
        except Exception as e:
            self.logger.error(f"Error ensuring collection: {e}")
            return {"error": str(e)}

    # --- Sync helpers ---
    def _merge_local_snapshots(self, user_id: str, local_snippets: List[Dict[str, Any]], existing_ids: Set[str]) -> List[str]:
        """
        Persist local snippets that do not exist in the server dataset yet.
        """
        created_ids: List[str] = []
        for snippet in local_snippets:
            snippet_id = str(snippet.get("id") or "").strip()
            content = snippet.get("content")
            if not snippet_id or not content or snippet_id in existing_ids:
                continue

            snippet_model = SnippetModel(
                id=snippet_id,
                user_id=user_id,
                content=content,
                tags=snippet.get("tags") or [],
                created_at=snippet.get("created_at"),
                updated_at=snippet.get("updated_at"),
            )

            if self._save_snippet(snippet_model.dict()):
                self._add_snippet_to_collection(user_id, snippet_model.id)
                existing_ids.add(snippet_model.id)
                created_ids.append(snippet_model.id)
        return created_ids

    def _get_collection_last_unix(self, user_id: str) -> int:
        """
        Fetch the stored collection unix timestamp for the user.
        """
        doc = self.collections.find_one({"user_id": user_id}, {"last_unix_timestamp": 1})
        # print("doc from _get_collection_last_unix()", doc)
        if doc and doc.get("last_unix_timestamp"):
            return int(doc["last_unix_timestamp"])
        return 0

    def _set_collection_last_unix(self, user_id: str, last_unix_timestamp: int) -> None:
        """
        Update the user's collection metadata with the latest unix timestamp.
        """
        try:
            now = datetime.utcnow()
            self.collections.update_one(
                {"user_id": user_id},
                {"$set": {"last_unix_timestamp": last_unix_timestamp, "updated_at": now}},
                upsert=True,
            )
        except PyMongoError as e:
            self.logger.error(f"Error updating collection timestamp: {e}")
            raise e

    def _derive_last_unix_timestamp(self, snippets: List[Dict[str, Any]], *candidates: Optional[int]) -> int:
        """
        Determine the most recent unix timestamp among snippets and extra candidates.
        """
        timestamps: List[int] = []
        for candidate in candidates:
            if isinstance(candidate, int):
                timestamps.append(candidate)
                continue
            parsed = self._parse_datetime(candidate)
            if parsed:
                timestamps.append(int(parsed.timestamp()))
        for snippet in snippets:
            updated_at = snippet.get("updated_at")
            if isinstance(updated_at, int):
                timestamps.append(updated_at)
                continue
            parsed = self._parse_datetime(updated_at)
            if parsed:
                timestamps.append(int(parsed.timestamp()))
        if timestamps:
            return max(timestamps)
        return int(datetime.utcnow().timestamp())

    def _current_iso_timestamp(self) -> str:
        """
        Return the current UTC time as an ISO formatted string. having T Z suffix.
        """
        return datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace("+00:00", "Z")

    def _parse_datetime(self, value: Any) -> Optional[datetime]:
        """
        Try to convert a string into a datetime object.
        """
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value)
            except ValueError:
                return None
        return None


