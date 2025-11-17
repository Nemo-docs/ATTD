from typing import Dict, Any, Optional, List
from datetime import datetime

from app.modules.inline_qna.agents import InlineAgents
from core.log_util import logger_instance
from core.clients import open_router_client
from app.modules.chat_qa.handle_basic_request import resolve_definations

from app.modules.chat_qa.schema import MentionedDefinition

class InlineQnaService:
    """
    Service for handling inline Q&A functionality.
    This service uses the OpenRouter client to answer user queries.
    """

    def __init__(self):
        self.logger = logger_instance

    def answer_query(
        self, query: str, page_id: str, highlighted_text: Optional[List[str]], context: Optional[str], mentioned_definitions: Optional[List[MentionedDefinition]], repo_hash: str
    ) -> Dict[str, Any]:
        """
        Answer a user's query using the OpenRouter client.

        Args:
            query: The user's query text
            page_id: The ID of the page where the query originated
            highlighted_text: Text highlighted User while asking query
            context: Context of the query
            mentioned_definitions: Definitions mentioned in the query
            repo_hash: The hash of the repository
        Returns:
            Dict containing the answer and metadata
        """
        try:
            self.logger.info(f"Processing inline Q&A query: {query}")

            # resolve definitions mentioned user's request
            resolved_query = resolve_definations(query, mentioned_definitions, repo_hash) + "\n\n" + context
            
            # Generate answer using OpenRouter
            if highlighted_text:
                resolved_context = resolved_query + "\n\n" + highlighted_text
                answer = InlineAgents.answer_query(resolved_context=resolved_context, 
                                                    highlighted_text=highlighted_text, 
                                                    )
            else:
                resolved_context = resolved_query
                answer = InlineAgents.answer_query(resolved_context=resolved_context)

            # Create response data
            response_data = {
                "query": query,
                "page_id": page_id,
                "highlighted_text": highlighted_text,
                "resolved_context": resolved_context,
                "answer": answer,
            }

            self.logger.info(f"Successfully generated answer for query: {query}")
            return response_data

        except Exception as e:
            self.logger.error(f"Error in answer_query: {str(e)}")
            return {
                "error": str(e),
                "query": query,
                "highlighted_text": highlighted_text,
                "resolved_context": resolved_context,
                "page_id": page_id,
                "repo_hash": repo_hash,
            }

    def _generate_answer(self, query: str) -> str:
        """
        Generate an answer using the OpenRouter client.

        Args:
            query: The user's query

        Returns:
            Generated answer or error message
        """
        try:
            # Create a helpful prompt for the AI
            system_prompt = """You are a helpful coding assistant that provides clear, concise answers to programming and technical questions.

When answering:
1. Be direct and practical
2. Provide code examples when relevant
3. Explain concepts clearly
4. Focus on the specific question asked
5. If the question is about code, suggest improvements or best practices
6. Keep responses focused and actionable

If you cannot provide a helpful answer, say so clearly rather than making up information."""

            user_prompt = f"""Please answer the following question:

{query}

Provide a clear, helpful response focused on the specific question asked."""

            # Call OpenRouter API
            response = open_router_client.chat.completions.create(
                model="openai/gpt-4o-mini",  # Using a capable model for Q&A
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=self.max_tokens,
                temperature=0.3,  # Lower temperature for more focused answers
            )

            answer = response.choices[0].message.content.strip()

            if not answer:
                return "Error: No response generated from AI model"

            return answer

        except Exception as e:
            self.logger.error(f"Error generating answer: {str(e)}")
            return f"Error: Failed to generate answer - {str(e)}"
