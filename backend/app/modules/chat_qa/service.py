import logging
import uuid
import os

# kept imports minimal for this service
from typing import Dict, Any, Optional
from datetime import datetime

from clients import open_router_client, mongodb_client
from app.modules.auto_generation.service import AutoGenerationService
from app.modules.chat_qa.handle_agentic_request import run_agentic_loop
from app.modules.chat_qa.models import ChatQaModel, ChatConversationModel


class ChatQaService:
    """
    Service for handling chat Q&A functionality.
    This service uses the OpenRouter client to provide conversational AI responses.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.max_tokens = 4000  # Reasonable limit for chat responses
        self.default_model = "openai/gpt-4o-mini"  # Fast and capable model
        # Initialize AutoGenerationService for fetching project intros by repo hash.
        try:
            self.auto_service = AutoGenerationService()
        except Exception as e:
            # If the service cannot be initialized (missing DB, clients, etc.),
            # log and continue without project context support.
            self.logger.warning(f"AutoGenerationService unavailable: {e}")
            self.auto_service = None

    def generate_response(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        page_id: Optional[str] = None,
        repo_hash: Optional[str] = None,
        model: Optional[str] = None,
        diagram_mode: Optional[bool] = False,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a chat response using the OpenRouter client.

        Args:
            message: The user's chat message
            conversation_id: Optional conversation ID for context
            page_id: Optional page ID for context
            model: Optional model override
            diagram_mode: Optional flag to enable diagram generation mode

        Returns:
            Dict containing the response and metadata
        """
        try:
            self.logger.info(f"Processing chat Q&A: {message[:50]}...")

            # Build system prompt context: fetch project intro by repo_hash if available
            project_context = None
            if repo_hash and getattr(self, "auto_service", None):
                try:
                    intro_data = self.auto_service.get_project_intro_by_hash(repo_hash)
                    if intro_data and isinstance(intro_data, dict):
                        project_context = {
                            "project_intro": intro_data.get("project_intro", ""),
                            "project_data_flow_diagram": intro_data.get(
                                "project_data_flow_diagram", ""
                            ),
                            "project_cursory_explanation": intro_data.get(
                                "project_cursory_explanation", ""
                            ),
                        }
                        self.logger.info(
                            f"Loaded project intro for repo_hash: {repo_hash}"
                        )
                    else:
                        self.logger.info(
                            f"No project intro found for repo_hash: {repo_hash}"
                        )
                except Exception as e:
                    self.logger.warning(
                        f"Failed to load project intro for {repo_hash}: {e}"
                    )

            # Prepend project intro if available to the user message to give model context
            user_message = message
            if project_context and project_context.get("project_intro"):
                # Provide labeled context so the LLM can incorporate it effectively
                user_message = (
                    "Project Introduction:\n"
                    + project_context.get("project_intro")
                    + "\n\n"
                    + "Project Data Flow Diagram:\n"
                    + project_context.get("project_data_flow_diagram")
                    + "\n\n"
                    + "Project Cursory Explanation:\n"
                    + project_context.get("project_cursory_explanation")
                    + "\n\n"
                    + "User message:\n"
                    + "```\n"
                    + message
                    + "```"
                )

            # Generate AI response
            response_text, tokens_used = self._generate_chat_response(
                user_message, model or self.default_model, diagram_mode
            )

            if response_text.startswith("Error:"):
                return {
                    "error": response_text,
                    "id": str(uuid.uuid4()),
                    "message": message,
                    "conversation_id": conversation_id,
                    "page_id": page_id,
                }

            # Generate unique response ID
            response_id = str(uuid.uuid4())

            # Create response data
            response_data = {
                "id": response_id,
                "message": message,
                "response": response_text,
                "conversation_id": conversation_id,
                "page_id": page_id,
                "diagram_mode": diagram_mode,
                "model_used": model or self.default_model,
                "tokens_used": tokens_used,
                "created_at": datetime.utcnow(),
                "user_id": user_id,
            }

            # Persist chat to database (best-effort, do not fail on DB errors)
            try:
                self.save_chat_to_db(response_data)
            except Exception as e:
                self.logger.warning(f"Failed to save chat to DB: {e}")

            self.logger.info(f"Successfully generated chat response: {response_id}")
            return response_data

        except Exception as e:
            self.logger.error(f"Error in generate_response: {str(e)}")
            return {
                "error": str(e),
                "id": str(uuid.uuid4()),
                "message": message,
                "conversation_id": conversation_id,
                "page_id": page_id,
                "diagram_mode": diagram_mode,
                "user_id": user_id,
            }

    def route_request(self, request: Any) -> Dict[str, Any]:
        """
        Route an incoming chat request to the appropriate handler.

        This method uses the OpenRouter client to analyse the user's message
        and determine whether the request requires an overall understanding
        of the repository. If so, it forwards the request to
        `generate_response`; otherwise it forwards to the simple
        placeholder handler `_handle_simple_request`.

        Args:
            request: The incoming request object (expected to have at least
                `message`, and optionally `conversation_id`, `page_id`,
                `repo_hash`, `diagram_mode`).

        Returns:
            Dict containing the response and metadata (same shape as
            `generate_response`).
        """
        try:
            message = getattr(
                request,
                "message",
                request.get("message") if isinstance(request, dict) else None,
            )
            conversation_id = getattr(
                request,
                "conversation_id",
                request.get("conversation_id") if isinstance(request, dict) else None,
            )
            page_id = getattr(
                request,
                "page_id",
                request.get("page_id") if isinstance(request, dict) else None,
            )
            repo_hash = getattr(
                request,
                "repo_hash",
                request.get("repo_hash") if isinstance(request, dict) else None,
            )
            think_level = getattr(
                request,
                "think_level",
                request.get("think_level") if isinstance(request, dict) else "simple",
            )
            diagram_mode = getattr(
                request,
                "diagram_mode",
                request.get("diagram_mode") if isinstance(request, dict) else False,
            )
            user_id = getattr(
                request,
                "user_id",
                request.get("user_id") if isinstance(request, dict) else None,
            )

            if not user_id:
                return {"error": "user_id is required", "id": str(uuid.uuid4())}

            if not message:
                return {"error": "No message provided", "id": str(uuid.uuid4())}

            # Use the OpenRouter client to analyse whether repository-level
            # context is required. We ask the model to return a simple YES/NO.
            analysis_prompt = (
                "You are an assistant that determines whether answering the user's "
                "message requires an general overall understanding of the target repository. If it does require then you should return YES. If the answer to user's query requires exact code files in detail then you should return NO (may have some file names or service name in the query). "
                "Respond with exactly one word: YES or NO.\n\n"
                f"User message:\n```\n{message}\n```"
            )

            analysis_resp = open_router_client.chat.completions.create(
                model=self.default_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You decide whether more breadth of repository-level context is required or some specific code files/services in depth detail.",
                    },
                    {"role": "user", "content": analysis_prompt},
                ],
                max_tokens=10,
                temperature=0.0,
            )

            analysis_text = ""
            try:
                analysis_text = analysis_resp.choices[0].message.content.strip().upper()
            except Exception:
                analysis_text = "NO"

            requires_repo_context = "YES" in analysis_text

            self.logger.info(
                f"Route analysis result (requires_repo_context={requires_repo_context}): {analysis_text}"
            )

            if requires_repo_context and think_level == "simple":
                # Forward to the full generator which can use repo context
                return self.generate_response(
                    message=message,
                    conversation_id=conversation_id,
                    page_id=page_id,
                    repo_hash=repo_hash,
                    diagram_mode=diagram_mode,
                    user_id=user_id,
                )
            else:
                return self._handle_agentic_request(
                    message=message,
                    conversation_id=conversation_id,
                    page_id=page_id,
                    repo_hash=repo_hash,
                    diagram_mode=diagram_mode,
                    user_id=user_id,
                )

        except Exception as e:
            self.logger.error(f"Error in route_request: {str(e)}")
            return {"error": str(e), "id": str(uuid.uuid4())}

    def _handle_agentic_request(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        page_id: Optional[str] = None,
        repo_hash: Optional[str] = None,
        diagram_mode: Optional[bool] = False,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Handle an agentic request.
        Args:
            message: The user's message
            conversation_id: Optional conversation ID for context
            page_id: Optional page ID for context
            repo_hash: Optional repository hash for context
            diagram_mode: Optional flag to enable diagram generation mode

        Returns:
            Dict containing the response and metadata
        """
        result = run_agentic_loop(
            [{"role": "user", "content": message}],
            max_iterations=10,
            repo_hash=repo_hash,
            dir_path="C:/Users/devan/Documents/ATTD/chainlite",
        )

        # response = self.generate_response(
        #     message=result, model=self.default_model, diagram_mode=diagram_mode
        # )
        try:
            # Generate AI response
            response_text, tokens_used = self._generate_chat_response(
                result, "openai/gpt-5-mini", diagram_mode
            )

            if response_text.startswith("Error:"):
                return {
                    "error": response_text,
                    "id": str(uuid.uuid4()),
                    "message": message,
                    "conversation_id": conversation_id,
                    "page_id": page_id,
                }

            # Generate unique response ID
            response_id = str(uuid.uuid4())

            # Create response data
            response_data = {
                "id": response_id,
                "message": message,
                "response": response_text,
                "conversation_id": conversation_id,
                "page_id": page_id,
                "diagram_mode": diagram_mode,
                "model_used": "openai/gpt-5-mini",
                "tokens_used": tokens_used,
                "created_at": datetime.utcnow(),
                "user_id": user_id,
            }

            # Persist chat to database (best-effort)
            try:
                self.save_chat_to_db(response_data)
            except Exception as e:
                self.logger.warning(f"Failed to save agentic chat to DB: {e}")

            self.logger.info(f"Successfully generated chat response: {response_id}")
            return response_data

        except Exception as e:
            self.logger.error(f"Error in _handle_agentic_request: {str(e)}")
            return {
                "error": str(e),
                "id": str(uuid.uuid4()),
                "message": message,
                "conversation_id": conversation_id,
                "page_id": page_id,
                "diagram_mode": diagram_mode,
                "user_id": user_id,
            }

    def create_conversation(
        self,
        title: Optional[str] = None,
        page_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new chat conversation.

        Args:
            title: Optional conversation title
            page_id: Optional associated page ID

        Returns:
            Dict containing conversation data
        """
        try:
            conversation_id = str(uuid.uuid4())
            conversation_title = (
                title or f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            )

            if not user_id:
                return {"error": "user_id is required to create a conversation"}

            conversation_data = {
                "id": conversation_id,
                "title": conversation_title,
                "page_id": page_id,
                "message_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "user_id": user_id,
            }

            # Persist conversation to DB (best-effort)
            try:
                self.save_conversation_to_db(conversation_data)
            except Exception as e:
                self.logger.warning(f"Failed to save conversation to DB: {e}")

            self.logger.info(f"Created new conversation: {conversation_id}")
            return conversation_data

        except Exception as e:
            self.logger.error(f"Error creating conversation: {str(e)}")
            return {"error": str(e)}

    def save_chat_to_db(self, chat: Dict[str, Any]) -> None:
        """Persist a chat entry to MongoDB and update conversation counters.

        This is best-effort and will not raise on DB errors; callers should
        catch exceptions if they need stronger guarantees.
        """
        db_name = os.getenv("DB_NAME", "attd_db")
        coll = mongodb_client[db_name]["chat_qa"]

        # Build a Pydantic model to validate/normalize the data before saving
        model = ChatQaModel.from_request_data(
            id=chat.get("id"),
            message=chat.get("message", ""),
            response=chat.get("response", ""),
            model_used=chat.get("model_used", self.default_model),
            tokens_used=int(chat.get("tokens_used", 0)),
            conversation_id=chat.get("conversation_id"),
            page_id=chat.get("page_id"),
            user_id=chat.get("user_id", ""),
        )

        doc = model.dict()
        # Let MongoDB set its own _id while storing our id
        coll.insert_one(doc)

        # If this chat belongs to a conversation, increment its message count
        conv_id = chat.get("conversation_id")
        if conv_id:
            conv_coll = mongodb_client[db_name]["chat_conversations"]
            conv_coll.update_one(
                {"id": conv_id},
                {
                    "$inc": {"message_count": 1},
                    "$set": {
                        "updated_at": datetime.utcnow(),
                        "user_id": chat.get("user_id"),
                    },
                },
                upsert=True,
            )

    def get_conversations(self, user_id: Optional[str] = None) -> list[Dict[str, Any]]:
        """Return a list of conversations filtered by user_id.

        Returns a list of conversation dicts suitable for returning from an API.
        """
        db_name = os.getenv("DB_NAME", "attd_db")
        coll = mongodb_client[db_name]["chat_conversations"]

        if not user_id:
            raise ValueError("user_id is required to list conversations")

        query: Dict[str, Any] = {"user_id": user_id}

        # Note: user_id is not currently stored on conversations; if needed,
        # the schema and save_conversation_to_db should be extended to include it.
        docs = list(coll.find(query).sort("updated_at", -1))

        # Convert ObjectId and datetimes to serializable dicts (Pydantic will
        # coerce datetimes when returned by FastAPI, so returning raw docs is OK
        # but ensure we only include expected fields).
        results = []
        for d in docs:
            # Ensure fields required by the response model are present and non-null.
            # Provide sensible defaults for older/partial documents so FastAPI
            # response validation does not fail with ResponseValidationError.
            title = d.get("title") or f"Chat {d.get('id', '')}"
            created_at = d.get("created_at") or datetime.utcnow()
            updated_at = d.get("updated_at") or created_at

            results.append(
                {
                    "id": d.get("id"),
                    "title": title,
                    "page_id": d.get("page_id"),
                    "message_count": int(d.get("message_count", 0)),
                    "created_at": created_at,
                    "updated_at": updated_at,
                    "user_id": d.get("user_id") or user_id,
                }
            )

        return results

    def get_conversation_messages(
        self, conversation_id: str, user_id: Optional[str] = None
    ) -> list[Dict[str, Any]]:
        """Return all chat messages for a given conversation id ordered by created_at."""
        db_name = os.getenv("DB_NAME", "attd_db")
        coll = mongodb_client[db_name]["chat_qa"]

        if not user_id:
            raise ValueError("user_id is required to fetch conversation messages")

        docs = list(
            coll.find({"conversation_id": conversation_id, "user_id": user_id}).sort(
                "created_at", 1
            )
        )

        results = []
        for d in docs:
            results.append(
                {
                    "id": d.get("id"),
                    "message": d.get("message"),
                    "response": d.get("response"),
                    "conversation_id": d.get("conversation_id"),
                    "page_id": d.get("page_id"),
                    "diagram_mode": d.get("diagram_mode", False),
                    "model_used": d.get("model_used"),
                    "tokens_used": int(d.get("tokens_used", 0)),
                    "created_at": d.get("created_at"),
                    "user_id": d.get("user_id") or user_id,
                }
            )

        return results

    def save_conversation_to_db(self, conversation: Dict[str, Any]) -> None:
        """Persist or update a conversation document in MongoDB.

        Uses upsert so creating a conversation is idempotent.
        """
        db_name = os.getenv("DB_NAME", "attd_db")
        coll = mongodb_client[db_name]["chat_conversations"]

        model = ChatConversationModel.from_request_data(
            id=conversation.get("id"),
            title=conversation.get("title", "Untitled"),
            page_id=conversation.get("page_id"),
            user_id=conversation.get("user_id", ""),
        )

        doc = model.dict()
        coll.update_one({"id": model.id}, {"$set": doc}, upsert=True)

    def _generate_chat_response(
        self, message: str, model: str, diagram_mode: bool = False
    ) -> tuple[str, int]:
        """
        Generate a chat response using the OpenRouter client.

        Args:
            message: The user's message
            model: The AI model to use
            diagram_mode: Whether to generate diagram-focused responses

        Returns:
            Tuple of (response_text, tokens_used)
        """
        try:
            system_prompt = """You are a helpful AI assistant for a technical documentation platform. You provide clear, accurate, and helpful responses to user questions.

When responding:
1. Be conversational and friendly
2. Provide specific, actionable information
3. Use code examples when relevant to technical questions
4. Explain concepts clearly without unnecessary jargon
5. If you don't know something, say so rather than guessing
6. Keep responses focused and concise but comprehensive
7. For coding questions, suggest best practices and improvements
8. Always use markdown to format your responses
9. Always use code blocks to format code examples

While explaining some concepts, you can use mermaid diagrams to format diagrams (no svg or other formats allowed). Choose one of the following types: flow charts, sequence diagram, class diagram, state diagram, ER diagram, C4, mindmap, Architecture.
When responding with the diagrams, you should follow the following rules:
1. Assume the user is very technical and show the technical details of the project
2. Provide a clear textual explanation first, then the diagram
3. Use proper Mermaid syntax with clear labels and styling
4. Focus on making diagrams that are and visually appealing
5. If multiple diagrams are needed, explain each one clearly
6. Use colors and styling to enhance clarity (e.g., different colors for different types of nodes)
7. Always provide both the diagram code and a textual explanation
8. Choose high contrast foreground and background colors for the diagrams
9. Use numbers to label the nodes and connections
10. Diagram will be shown on a dark mode so use light colors for the diagrams
11. Branches/cycles are preferred. (for better understanding)

For diagram syntax:
- Use proper Mermaid formatting like this: ```mermaid 
- Add clear labels and descriptions with numbers
- Use appropriate shapes and connections with numbers
- Include a legend when helpful

Always start with a brief textual explanation, then provide the Mermaid diagram code in a code block.
some common exmaple of making errors in mermaid diagrams:
=======================================================
Learning - Do not use parentheses '()' in the diagram code.
=======================================================

Always aim to be maximally helpful while being truthful about your limitations."""

            # Call OpenRouter API
            # self.logging.info("system_prompt: ", system_prompt)
            # self.logging.info("message: ", message)
            response = open_router_client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                max_tokens=self.max_tokens,
                temperature=0.7,  # Balanced creativity and consistency
            )

            response_text = response.choices[0].message.content.strip()
            tokens_used = (
                response.usage.total_tokens if getattr(response, "usage", None) else 0
            )

            if not response_text:
                return "Error: No response generated from AI model", 0

            return response_text, tokens_used

        except Exception as e:
            self.logger.error(f"Error generating chat response: {str(e)}")
            return f"Error: Failed to generate response - {str(e)}", 0
