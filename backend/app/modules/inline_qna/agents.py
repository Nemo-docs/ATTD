from typing import List, Optional
from core.logger import logger_instance
from core.llm_clients import llm_client
from app.modules.inline_qna.prompts import system_prompt, highlight_user_prompt, non_highlight_user_prompt

class InlineAgents:
    def __init__(self):
        self.logger = logger_instance

    @classmethod
    def answer_query(cls, resolved_query: str) -> str:
        """
        Answer a user's query using the OpenRouter client.
        """
        try:
            if "<highlighted_command_block_selection_blocks>" in resolved_query:
                msgs = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": highlight_user_prompt(resolved_query)},
                ]
                resp = llm_client.chat.completions.create(
                    model="gpt-5-mini",
                    messages=msgs,
                )
                answer = resp.choices[0].message.content.strip()
                return answer
            else:
                msgs = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": non_highlight_user_prompt(resolved_query)},
                ]
                resp = llm_client.chat.completions.create(
                    model="gpt-5-mini",
                    messages=msgs,
                )
                answer = resp.choices[0].message.content.strip()
                return answer
        except Exception as e:
            logger_instance.error(f"Error answering query: {e}")
            raise e