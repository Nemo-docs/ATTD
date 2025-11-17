from typing import List, Optional
from core.log_util import logger_instance
from core.clients import open_router_client

class InlineAgents:
    def __init__(self):
        self.logger = logger_instance
        self.open_router_client = open_router_client

    @classmethod
    def answer_query(cls, resolved_context: str, highlighted_text: Optional[List[str]]) -> str:
        """
        Answer a user's query using the OpenRouter client.
        """
        try:
            cls.logger.info(f"Answering query: {resolved_context}")
            cls.logger.info(f"Highlighted Text: {highlighted_text}")
            # Generate answer using OpenRouter
            # answer = cls.generate_answer(query, page_id, highlighted_text, resolved_context, repo_hash)
            answer = "Answer to the query"
            return answer
        except Exception as e:
            cls.logger.error(f"Error answering query: {e}")
            raise e