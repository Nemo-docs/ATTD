import json
from typing import List, Dict, Any, Optional, Callable, Literal
from pydantic import BaseModel, Field
from core.llm_clients import llm_client
from app.modules.auto_generation.prompts import agent_generate_project_p1_system_prompt
from core.logger import logger_instance
from core.config import settings
import os

class P1Agent:
    def __init__(
        self,
        cursory_explanation: str,
        repo_hash: str,
        max_iterations: int = 10,
        repo_type: Literal["application", "library", "service"] = "application",
    ):
        self.max_iterations = max_iterations
        self.repo_type = repo_type
        self.cursory_explanation = cursory_explanation
        self.output_model = self._get_output_model()
        self.tool_schemas = self._get_tool_schemas()
        self.logger = logger_instance
        self.repo_hash = repo_hash
        self.repo_path = settings.PARENT_DIR + "/" + self.repo_hash

    def _get_tool_schemas(self) -> List[Dict[str, Any]]:

        return [{
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Read the entire contents of a file given its path to get detailed infomation about it.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "The path to the file from the root of the repository to read like app/main.py or app/models.py."
                        }
                    },
                    "required": ["path"],
                    "additionalProperties": False
                }
            }
        }]

    def _get_output_model(self) -> Dict[str, Any]:
        if self.repo_type == "application":
            schema = {
                "type": "object",
                "properties": {
                    "overview": {
                        "type": "string",
                        "description": "Detailed markdown description of what the app does."
                    },
                    "setup_and_installation": {
                        "type": "string",
                        "description": "Markdown steps to set up and run the app locally."
                    },
                    "testing": {
                        "type": "string",
                        "description": "Markdown instructions on how to run tests."
                    }
                },
                "required": ["overview", "setup_and_installation", "testing"],
                "additionalProperties": False
            }
        elif self.repo_type == "library":
            schema = {
                "type": "object",
                "properties": {
                    "purpose": {
                        "type": "string",
                        "description": "Markdown description of what the library solves."
                    },
                    "installation": {
                        "type": "string",
                        "description": "Markdown instructions on how to install the library in a project."
                    },
                    "quick_start_examples": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of markdown code snippets for quick start examples."
                    }
                },
                "required": ["purpose", "installation", "quick_start_examples"],
                "additionalProperties": False
            }
        elif self.repo_type == "service":
            schema = {
                "type": "object",
                "properties": {
                    "service_description": {
                        "type": "string",
                        "description": "Markdown description of what the service provides."
                    },
                    "running_locally": {
                        "type": "string",
                        "description": "Markdown commands and dependencies to run the service locally."
                    }
                },
                "required": ["service_description", "running_locally"],
                "additionalProperties": False
            }
        else:
            raise ValueError(f"Unsupported repo_type: {self.repo_type}")
        
        name = f"{self.repo_type}_output"
        json_schema = {
            "name": name,
            "strict": True,
            "schema": schema
        }
        return {"type": "json_schema", "json_schema": json_schema}


    def _get_structure_instructions(self) -> str:
        base_instruction = f"""
Here is the cursory explanation of the project:

Project Structure and File Roles:
```
{self.cursory_explanation}
```
"""
        if self.repo_type == "application":
            return base_instruction + """
The JSON object must have the following structure:
- "overview": A detailed description in markdown format of what the application does, including technical details. Pay more focus on file while are likely to be relevant for overview.
- "setup_and_installation": Step-by-step instructions in markdown to set up and run the application locally. Pay more focus on file while are likely to be relevant for setup and installation.
- "testing": Instructions in markdown on how to run the tests for the application. Pay more focus on file while are likely to be relevant for testing.
"""
        elif self.repo_type == "library":
            return base_instruction + """
The JSON object must have the following structure:
- "purpose": A description in markdown format of what problem the library solves, including technical details. Pay more focus on file while are likely to be relevant for overview.
- "installation": Instructions in markdown on how to add and install the library to a project. Pay more focus on file while are likely to be relevant for installation.
- "quick_start_examples": An array of strings, where each string is a small code snippet example in markdown format (using code blocks) demonstrating real use cases. Pay more focus on file while are likely to be relevant for quick start examples.
"""
        elif self.repo_type == "service":
            return base_instruction + """
The JSON object must have the following structure:
- "service_description": A description in markdown format of what the service provides, including technical details. Pay more focus on file while are likely to be relevant for overview.
- "running_locally": Commands, dependencies, and steps in markdown to run the service locally. Pay more focus on file while are likely to be relevant for running locally.
"""
        else:
            return ""

    def _execute_tool_call(self, tool_call: Any) -> Dict[str, Any]:
        tool_name = tool_call.function.name
        try:
            args = json.loads(tool_call.function.arguments)
        except json.JSONDecodeError:
            return {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": "Error: Invalid arguments provided."
            }

        if tool_name == "read_file":
            path = os.path.join(self.repo_path, args.get("path"))
            self.logger.info(f"Reading file: {path}")
            try:
                with open(path, 'r', encoding='utf-8') as file:
                    result = file.read()
            except FileNotFoundError:
                self.logger.error(f"File not found at path: {path}")
                result = f"Error: File not found at path '{path}'."
            except Exception as e:
                self.logger.error(f"Error reading file: {str(e)}")
                result = f"Error reading file: {str(e)}"
            return {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": args.get("path") + "\n\n" + str(result)
            }
        else:
            return {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": f"Unknown tool: {tool_name}"
            }

    async def run(self):
        system_content = agent_generate_project_p1_system_prompt.format(repo_type=self.repo_type)
        structure_instructions = self._get_structure_instructions()
        system_msg = {"role": "system", "content": system_content}
        messages = [{"role": "user", "content": structure_instructions}]
        # messages[0]["content"] = messages[0]["content"] + "\n\nALWAYS USE THE TOOLS TO GET THE INFORMATION YOU NEED."
        full_messages = [system_msg] + messages
        # print("FORCING TOOL CALLS FOR TESTING")

        iteration = 0
        while iteration < self.max_iterations:
            iteration += 1

            resp = llm_client.chat.completions.create(
                model="gpt-5-mini",
                messages=full_messages,
                tools=self.tool_schemas,
                response_format=self.output_model,
            )

            choice = resp.choices[0]
            assistant_msg = choice.message.dict()
            full_messages.append(assistant_msg)

            if not choice.message.tool_calls:
                break

            for tool_call in choice.message.tool_calls:
                tool_msg = self._execute_tool_call(tool_call)
                full_messages.append(tool_msg)

        # Parse the final assistant message
        final_msg = full_messages[-1]
        if final_msg.get("role") == "assistant" and "content" in final_msg:
            try:
                parsed_data = json.loads(final_msg["content"])
                return parsed_data
            except json.JSONDecodeError:
                # Fallback to raw content if parsing fails
                return final_msg["content"]
        else:
            return "No valid response generated."

