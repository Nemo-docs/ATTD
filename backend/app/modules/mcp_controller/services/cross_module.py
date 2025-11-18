from typing import Dict, List, Optional, Any 

from core.log_util import logger_instance

from app.modules.page_management.service import PageManagementService
from app.modules.snippet_management.service import SnippetManagementService




class MCPControllerService:
    def __init__(self):
        self.page_service = PageManagementService()
        self.snippet_service = SnippetManagementService()
        
    # Create page and return page object from page_management module
    def create_page(self, user_id: str, title: str, content: str) -> Dict[str, Any]:

        logger_instance.info(f"Creating new page: {title} for user: {user_id}")
        result = self.page_service.create_page(user_id=user_id, title=title, content=content)

        if "error" in result:
            logger_instance.error(f"Page creation failed: {result['error']}")


        logger_instance.info(f"Successfully created page with ID: {result['page'].id}")
        return result


    # Get page and return page object from page_management module
    def get_page(self, page_id: str, user_id: str) -> Optional[Dict[str, Any]]:

        logger_instance.info(f"Retrieving page with ID: {page_id} for user: {user_id}")
        result = self.page_service.get_page(page_id=page_id, user_id=user_id)

        if result is None:
            return None
        
        elif "error" in result:
            logger_instance.error(f"Failed to retrieve page: {result['error']}")
            return None

        else:
            logger_instance.info(f"Successfully retrieved page with ID: {page_id}")
            return result


    

    # Get all page descriptions and return page descriptions list from page_management module
    def get_all_page_descriptions(self, user_id: str) -> List[Dict[str, Any]]:

        logger_instance.info(f"Retrieving all page descriptions for user: {user_id}")
        try:
            result = self.page_service.get_all_page_descriptions(user_id=user_id)
            logger_instance.info(f"Successfully retrieved {len(result)} page descriptions")
            return result
        except Exception as e:
            logger_instance.error(f"Failed to retrieve page descriptions: {str(e)}")
            raise

        
    

    # Get snippet and return snippet object from snippet_management module
    def get_all_snippets(self, user_id: str) -> Optional[List[Dict[str, Any]]]:

        logger_instance.info(f"Retrieving all snippets for user: {user_id}")
        result = self.snippet_service.get_all_snippets(user_id=user_id)

        if "error" not in result:
            logger_instance.info(f"Successfully retrieved all snippet of length {result.get('total_count')}")
            return result.get("snippets")

        else:
            logger_instance.error(f"Failed to retrieve snippet: {result['error']}")
            return None
