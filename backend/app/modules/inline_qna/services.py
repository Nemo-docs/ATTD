import logging
from typing import Dict, Any
from datetime import datetime

from clients import open_router_client


class InlineQnaService:
    """
    Service for handling inline Q&A functionality.
    This service uses the OpenRouter client to answer user queries.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.max_tokens = 4000  # Reasonable limit for Q&A responses

    def answer_query(
        self, text: str, cursor_position: dict, page_id: str
    ) -> Dict[str, Any]:
        """
        Answer a user's query using the OpenRouter client.

        Args:
            text: The user's query text
            cursor_position: The position of the cursor in the text (x, y coordinates)
            page_id: The ID of the page where the query originated

        Returns:
            Dict containing the answer and metadata
        """
        try:
            self.logger.info(f"Processing inline Q&A query: {text[:50]}...")

            # Generate answer using OpenRouter
            answer = self._generate_answer(text)

            if answer.startswith("Error:"):
                return {
                    "error": answer,
                    "text": text,
                    "cursor_position": cursor_position,
                    "page_id": page_id,
                }

            # Create response data
            response_data = {
                "text": text,
                "cursor_position": cursor_position,
                "page_id": page_id,
                "answer": answer,
                "created_at": datetime.utcnow(),
            }

            self.logger.info(f"Successfully generated answer for query: {text[:50]}...")
            return response_data

        except Exception as e:
            self.logger.error(f"Error in answer_query: {str(e)}")
            return {
                "error": str(e),
                "text": text,
                "cursor_position": cursor_position,
                "page_id": page_id,
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
