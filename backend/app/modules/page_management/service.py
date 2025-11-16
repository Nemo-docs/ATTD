from datetime import datetime
from typing import Dict, List, Optional, Any
from pymongo.collection import Collection
from pymongo.errors import PyMongoError
from core.clients import mongodb_client
from core.config import settings
from core.log_util import logger_instance
from app.modules.page_management.models import PageModel

class PageManagementService:
    """
    Service for managing pages in the system.

    This service handles CRUD operations for pages, including:
    - Creating new pages with random IDs
    - Retrieving pages by ID or listing all pages
    - Updating page content and titles
    - Deleting pages
    """

    def __init__(self):
        self.logger = logger_instance

        # Database setup
        self.db_name = settings.DB_NAME
        self.collection_name = "pages"
        self.db = mongodb_client[self.db_name]
        self.collection: Collection = self.db[self.collection_name]

        # Create index on page id for faster lookups
        try:
            self.collection.create_index("id", unique=True)
            self.collection.create_index([("user_id", 1), ("created_at", -1)])
            self.logger.info(
                f"Created unique index on id in collection {self.collection_name}"
            )
        except PyMongoError as e:
            self.logger.error(f"Could not create index: {e}")

    def create_page(
        self, user_id: str, title: str, content: str = ""
    ) -> Dict[str, Any]:
        """
        Create a new page with the given title and content.

        Args:
            title: Page title
            content: Initial page content (default: empty)

        Returns:
            Dict containing page data or error information
        """
        try:
            self.logger.info(f"Creating new page with title: {title}")

            if not user_id:
                return {"error": "user_id is required"}

            # Create page model
            page_model = PageModel(
                user_id=user_id,
                title=title,
                content=content,
            )

            # Convert to dict for database storage
            page_data = page_model.dict()

            # Save to database
            success = self._save_page(page_data)

            if success:
                self.logger.info(f"Successfully created page with ID: {page_model.id}")
                return {"page": page_model, "message": "Page created successfully"}
            else:
                return {"error": "Failed to save page to database"}

        except Exception as e:
            self.logger.error(f"Error creating page: {str(e)}")
            return {"error": str(e)}

    def get_page(
        self, page_id: str, user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve a page by its ID.

        Args:
            page_id: The unique page identifier

        Returns:
            Dict containing page data if found, None otherwise
        """
        try:
            if not user_id:
                return {"error": "user_id is required"}

            self.logger.info(f"Retrieving page with ID: {page_id}")
            return self._get_page(page_id, user_id=user_id)
        except Exception as e:
            self.logger.error(f"Error retrieving page: {str(e)}")
            return {"error": str(e)}

    def get_all_pages(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Retrieve all pages in the system.

        Returns:
            Dict containing list of pages and total count
        """
        try:
            if not user_id:
                return {"error": "user_id is required"}

            self.logger.info("Retrieving all pages")

            # Get all pages from database
            pages_data = self._get_all_pages(user_id=user_id)

            # Convert to PageModel instances for consistent response format
            pages = []
            for page_data in pages_data:
                try:
                    page_model = PageModel(**page_data)
                    pages.append(page_model)
                except Exception as e:
                    self.logger.error(f"Error converting page data: {e}")
                    continue

            return {"pages": pages, "total_count": len(pages)}

        except Exception as e:
            self.logger.error(f"Error retrieving all pages: {str(e)}")
            return {"error": str(e)}

    def update_page(
        self,
        page_id: str,
        user_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Update a page's title and/or content.

        Args:
            page_id: The unique page identifier
            title: New page title (optional)
            content: New page content (optional)

        Returns:
            Dict containing updated page data or error information
        """
        try:
            if not user_id:
                return {"error": "user_id is required"}

            self.logger.info(f"Updating page with ID: {page_id}")

            # Get existing page
            existing_page = self._get_page(page_id, user_id=user_id)
            if not existing_page:
                return {"error": f"Page with ID {page_id} not found"}

            # Update fields
            update_data = {}
            if title is not None:
                update_data["title"] = title
            if content is not None:
                update_data["content"] = content
            update_data["updated_at"] = datetime.utcnow()

            # Update in database
            success = self._update_page(page_id, user_id, update_data)

            if success:
                # Get updated page data
                updated_page = self._get_page(page_id, user_id=user_id)
                if updated_page:
                    page_model = PageModel(**updated_page)
                    self.logger.info(f"Successfully updated page with ID: {page_id}")
                    return {"page": page_model, "message": "Page updated successfully"}

            return {"error": "Failed to update page"}

        except Exception as e:
            self.logger.error(f"Error updating page: {str(e)}")
            return {"error": str(e)}

    def delete_page(self, page_id: str, user_id: str) -> Dict[str, Any]:
        """
        Delete a page by its ID.

        Args:
            page_id: The unique page identifier

        Returns:
            Dict containing success message or error information
        """
        try:
            if not user_id:
                return {"error": "user_id is required"}

            self.logger.info(f"Deleting page with ID: {page_id}")

            # Check if page exists
            existing_page = self._get_page(page_id, user_id=user_id)
            if not existing_page:
                return {"error": f"Page with ID {page_id} not found"}

            # Delete from database
            success = self._delete_page(page_id, user_id)

            if success:
                self.logger.info(f"Successfully deleted page with ID: {page_id}")
                return {
                    "message": "Page deleted successfully",
                    "deleted_page_id": page_id,
                }
            else:
                return {"error": "Failed to delete page"}

        except Exception as e:
            self.logger.error(f"Error deleting page: {str(e)}")
            return {"error": str(e)}

    # Database operations

    def _save_page(self, page_data: Dict[str, Any]) -> bool:
        """
        Save page data to MongoDB.

        Args:
            page_data: Dictionary containing page data

        Returns:
            bool: True if saved successfully, False otherwise
        """
        try:
            # Add timestamps
            page_data["created_at"] = datetime.utcnow()
            page_data["updated_at"] = datetime.utcnow()

            # Insert or update based on id
            result = self.collection.replace_one(
                {"id": page_data["id"]}, page_data, upsert=True
            )

            if result.upserted_id or result.modified_count > 0:
                self.logger.info(f"Successfully saved page with ID: {page_data['id']}")
                return True
            else:
                self.logger.error(f"No changes made for page ID: {page_data['id']}")
                return False

        except PyMongoError as e:
            self.logger.error(f"Error saving page to database: {e}")
            raise e

    def _get_page(
        self, page_id: str, user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve page data from MongoDB by ID.

        Args:
            page_id: The page identifier

        Returns:
            Dict: Page data if found, None otherwise
        """
        try:
            query = {"id": page_id}
            if user_id:
                query["user_id"] = user_id

            result = self.collection.find_one(query)
            if not result and user_id:
                fallback = self.collection.find_one(
                    {"id": page_id, "user_id": {"$exists": False}}
                )
                if fallback:
                    self.collection.update_one(
                        {"_id": fallback["_id"]}, {"$set": {"user_id": user_id}}
                    )
                    fallback["user_id"] = user_id
                    result = fallback
            if result:
                # Remove MongoDB _id field for cleaner response
                result.pop("_id", None)
                if user_id and not result.get("user_id"):
                    result["user_id"] = user_id
                self.logger.info(f"Retrieved page with ID: {page_id}")
                return result
            else:
                self.logger.info(f"No page found with ID: {page_id}")
                return None

        except PyMongoError as e:
            self.logger.error(f"Error retrieving page from database: {e}")
            raise e

    def _get_all_pages(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieve all pages from MongoDB.

        Returns:
            List of page data dictionaries
        """
        try:
            # Sort by creation date (newest first)
            query: Dict[str, Any] = {}
            if user_id:
                query = {
                    "$or": [
                        {"user_id": user_id},
                        {"user_id": {"$exists": False}},
                    ]
                }

            cursor = self.collection.find(query).sort("created_at", -1)
            pages = list(cursor)

            # Remove MongoDB _id field for cleaner response
            for page in pages:
                page.pop("_id", None)
                if user_id and not page.get("user_id"):
                    page["user_id"] = user_id

            self.logger.info(f"Retrieved {len(pages)} pages")
            return pages

        except PyMongoError as e:
            self.logger.error(f"Error retrieving all pages from database: {e}")
            raise e

    def _update_page(
        self, page_id: str, user_id: str, update_data: Dict[str, Any]
    ) -> bool:
        """
        Update page data in MongoDB.

        Args:
            page_id: The page identifier
            update_data: Dictionary containing fields to update

        Returns:
            bool: True if updated successfully, False otherwise
        """
        try:
            result = self.collection.update_one(
                {"id": page_id, "user_id": user_id}, {"$set": update_data}
            )

            if result.modified_count == 0 and user_id:
                result = self.collection.update_one(
                    {"id": page_id, "user_id": {"$exists": False}},
                    {"$set": {**update_data, "user_id": user_id}},
                )

            if result.modified_count > 0:
                self.logger.info(f"Successfully updated page with ID: {page_id}")
                return True
            else:
                self.logger.error(f"No changes made for page ID: {page_id}")
                return False

        except PyMongoError as e:
            self.logger.error(f"Error updating page in database: {e}")
            raise e

    def _delete_page(self, page_id: str, user_id: str) -> bool:
        """
        Delete page data from MongoDB.

        Args:
            page_id: The page identifier

        Returns:
            bool: True if deleted successfully, False otherwise
        """
        try:
            result = self.collection.delete_one({"id": page_id, "user_id": user_id})

            if result.deleted_count == 0 and user_id:
                result = self.collection.delete_one(
                    {"id": page_id, "user_id": {"$exists": False}}
                )
            if result.deleted_count > 0:
                self.logger.info(f"Successfully deleted page with ID: {page_id}")
                return True
            else:
                self.logger.error(f"No page found to delete with ID: {page_id}")
                return False

        except PyMongoError as e:
            self.logger.error(f"Error deleting page from database: {e}")
            raise e
