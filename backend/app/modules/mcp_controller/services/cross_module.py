from typing import Dict, Any

from core.log_util import logger_instance

from app.modules.page_management.service import PageManagementService
from app.modules.snippet_management.service import SnippetManagementService




class MCPControllerService:
    def __init__(self):
        self.page_service = PageManagementService()
        self.snippet_service = SnippetManagementService()
        

    async def create_page(self, user_id: str, title: str, content: str) -> Dict[str, Any]:

        logger_instance.info(f"Creating new page: {title} for user: {user_id}")
        result = await self.page_service.create_page(user_id=user_id, title=title, content=content)

        if "error" in result:
            logger_instance.error(f"Page creation failed: {result['error']}")


        logger_instance.info(f"Successfully created page with ID: {result['page'].id}")
        return result

    async def get_page(self, page_id: str, user_id: str) -> Dict[str, Any]:

        logger_instance.info(f"Retrieving page with ID: {page_id} for user: {user_id}")
        result = await self.page_service.get_page(page_id=page_id, user_id=user_id)

        if "error" in result:
            logger_instance.error(f"Failed to retrieve page: {result['error']}")

        logger_instance.info(f"Successfully retrieved page with ID: {page_id}")
        return result
    
    async def get_all_page_titles(self, user_id: str) -> Dict[str, Any]:

        logger_instance.info(f"Retrieving all page titles for user: {user_id}")
        result = await self.page_service.get_all_page_titles(user_id=user_id)

        if "error" in result:
            logger_instance.error(f"Failed to retrieve page titles: {result['error']}")

        logger_instance.info(f"Successfully retrieved {result['total_count']} page titles")
        return result
    
    async def get_snippet(self, snippet_id: str, user_id: str) -> Dict[str, Any]:

        logger_instance.info(f"Retrieving snippet with ID: {snippet_id} for user: {user_id}")
        result = await self.snippet_service.get_snippet(snippet_id=snippet_id, user_id=user_id)

        if "error" in result:
            logger_instance.error(f"Failed to retrieve snippet: {result['error']}")

        logger_instance.info(f"Successfully retrieved snippet with ID: {snippet_id}")
        return result