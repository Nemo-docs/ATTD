from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid
import os

from app.modules.inline_qna.agents import InlineAgents
from app.modules.inline_qna.models import InlineQnaModel
from core.logger import logger_instance
from core.clients import mongodb_client
from core.config import settings
from app.modules.chat_qa.schema import MentionedDefinition
from app.modules.chat_qa.handle_basic_request import resolve_definations

class InlineQnaService:
    """
    Service for handling inline Q&A functionality.
    This service uses the OpenRouter client to answer user queries.
    """

    def __init__(self):
        self.logger = logger_instance

    async def answer_query(
        self, user_id: str, query: str, page_id: str, mentioned_definitions: Optional[List[MentionedDefinition]], repo_hash: str
    ) -> Dict[str, Any]:
        """
        Answer a user's query using the OpenRouter client.

        Args:
            user_id: The ID of the user
            query: The user's query text
            page_id: The ID of the page where the query originated
            mentioned_definitions: Definitions mentioned in the query
            repo_hash: The hash of the repository
        Returns:
            Dict containing the answer and metadata
        """
        resolved_query = query  # Initialize early
        try:
            self.logger.info(f"Processing inline Q&A query: {query}")

            # resolve definitions mentioned user's request
            if mentioned_definitions:
                resolved_query = await resolve_definations(query, mentioned_definitions, repo_hash) + "\n\n"

            # Generate answer using OpenRouter
            answer = InlineAgents.answer_query(resolved_query=resolved_query)

            # Generate unique response ID
            response_id = str(uuid.uuid4())

            # Create response data
            created_at = datetime.utcnow()
            response_data = {
                "id": response_id,
                "query": query,
                "page_id": page_id,
                "resolved_query": resolved_query,
                "answer": answer,
                "created_at": created_at,
            }

            self.logger.info(f"Successfully generated answer for query: {query}")

            # TODO: This is temporary, we need to save response to database
            # save response to database
            inline_qna_model = InlineQnaModel.from_request_data(
                user_id=user_id,
                query=query,
                page_id=page_id,
                resolved_query=resolved_query,
                answer=answer
            )
            await self.save_response_to_database(inline_qna_model)
            return response_data

        except Exception as e:
            self.logger.error(f"Error in answer_query: {str(e)}")
            return {
                "error": str(e),
                "query": query,
                "resolved_query": resolved_query,
                "page_id": page_id,
                "repo_hash": repo_hash,
            }

    async def save_response_to_database(self, inline_qna_model: InlineQnaModel) -> None:
        """
        Save the response to the database.
        """
        try:
            db_name = settings.DB_NAME
            coll = mongodb_client[db_name]["inline_qna"]
            doc = inline_qna_model.dict()
            # Let MongoDB set its own _id while storing our id
            await coll.insert_one(doc)
        except Exception as e:
            self.logger.error(f"Failed to save inline Q&A to DB: {e}")