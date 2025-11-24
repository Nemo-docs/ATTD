import json
import re
from typing import List, Dict, Any, Optional, Callable, Literal
from pydantic import BaseModel, Field
from core.llm_clients import llm_client
from app.modules.auto_generation.prompts import agent_generate_project_p1_system_prompt, agent_generate_project_p2_system_prompt, check_fix_mermaid_code_system_prompt, check_fix_mermaid_code_user_prompt, agent_generate_project_p3_system_prompt
from core.logger import logger_instance
from core.config import settings
import os
import asyncio

class P1Agent:
    def __init__(
        self,
        cursory_explanation: str,
        repo_hash: str,
        max_iterations: int = 10,
        repo_type: Literal["application", "library", "service"] = "application",
    ):
        self.repo_hash = repo_hash
        self.max_iterations = max(max_iterations, self._get_file_count())
        self.repo_type = repo_type
        self.cursory_explanation = cursory_explanation
        self.output_model = self._get_output_model()
        self.tool_schemas = self._get_tool_schemas()
        self.logger = logger_instance
        self.repo_path = settings.PARENT_DIR + "/" + self.repo_hash

    def _get_file_count(self) -> int:
        '''
        Get the number of files in the repository recursively.
        '''
        path = settings.PARENT_DIR + "/" + self.repo_hash
        count = 0
        for _, _ , files in os.walk(path):
            count += len(files)
        return count

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

    async def _execute_tool_call(self, tool_call: Any) -> Dict[str, Any]:
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
                # Wrap synchronous file read in asyncio.to_thread for async execution
                def read_file_sync():
                    with open(path, 'r', encoding='utf-8') as file:
                        return file.read()
                result = await asyncio.to_thread(read_file_sync)
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

            # Execute tool calls in parallel for better latency
            tool_call_tasks = [self._execute_tool_call(tool_call) for tool_call in choice.message.tool_calls]
            tool_msgs = await asyncio.gather(*tool_call_tasks, return_exceptions=True)
            
            # Handle any exceptions from gather
            for i, tool_msg in enumerate(tool_msgs):
                if isinstance(tool_msg, Exception):
                    tool_call = choice.message.tool_calls[i]
                    tool_msgs[i] = {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": f"Error executing tool: {str(tool_msg)}"
                    }
            
            full_messages.extend(tool_msgs)

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


class P2Agent:
    def __init__(
        self,
        cursory_explanation: str,
        repo_hash: str,
        max_iterations: int = 10,
    ):
        self.repo_hash = repo_hash
        self.max_iterations = max(max_iterations, self._get_file_count())
        self.cursory_explanation = cursory_explanation
        self.output_model = {"type": "text"}
        self.tool_schemas = self._get_tool_schemas()
        self.logger = logger_instance
        self.repo_path = settings.PARENT_DIR + "/" + self.repo_hash

    def _get_file_count(self) -> int:
        '''
        Get the number of files in the repository recursively.
        '''
        path = settings.PARENT_DIR + "/" + self.repo_hash
        count = 0
        for _, _ , files in os.walk(path):
            count += len(files)
        return count

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

    def _get_structure_instructions(self) -> str:
        base_instruction = f"""
Here is the cursory explanation of the project:

Project Structure and File Roles:
```
{self.cursory_explanation}
```
"""
        return base_instruction + """
You need to identify the core concepts of this repository. 

First, list all major components and parts based on the structure.

Then, select the top 5 unique and challenging parts (e.g., High-Level Logic, Key Modules, Data Flow, and two others relevant to this repo) that a software engineer might find difficult.

Structure the 5 concepts as:
- 2 topics for newly onboarded engineers to solve basic doubts (clear, introductory explanations).
- 3 in-depth topics for experienced engineers working on the project.

For each concept:
- Provide a detailed technical explanation in markdown.
- Include a mermaid diagram if it helps illustrate (e.g., flowchart for logic/data flow, graph for modules).

Use the read_file tool to access file contents for accurate details.

Output as a single markdown document:

# Core Concepts

## Introduction
[Brief overview]

## 1. [Concept 1 - e.g., High-Level Logic]
[Explanation]

```mermaid
[Diagram code if applicable]
```

## 2. [Concept 2 - e.g., Key Modules]
...

Focus on unique aspects of this repository.
"""

    async def _execute_tool_call(self, tool_call: Any) -> Dict[str, Any]:
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
                def read_file_sync():
                    with open(path, 'r', encoding='utf-8') as file:
                        return file.read()
                result = await asyncio.to_thread(read_file_sync)
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

    async def run(self) -> str:
        system_content = agent_generate_project_p2_system_prompt
        structure_instructions = self._get_structure_instructions()
        system_msg = {"role": "system", "content": system_content}
        messages = [{"role": "user", "content": structure_instructions}]
        full_messages = [system_msg] + messages

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

            tool_call_tasks = [self._execute_tool_call(tool_call) for tool_call in choice.message.tool_calls]
            tool_msgs = await asyncio.gather(*tool_call_tasks, return_exceptions=True)
            
            for i, tool_msg in enumerate(tool_msgs):
                if isinstance(tool_msg, Exception):
                    tool_call = choice.message.tool_calls[i]
                    tool_msgs[i] = {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": f"Error executing tool: {str(tool_msg)}"
                    }
            
            full_messages.extend(tool_msgs)

        final_msg = full_messages[-1]
        if final_msg.get("role") == "assistant" and "content" in final_msg:
            return final_msg["content"]
        else:
            return "No valid response generated."

    async def _llm_mermaid_code_fixing(self, mermaid_code: str) -> str:
        """Fix a single Mermaid code snippet by calling the LLM to validate and correct it."""
        try:
            system_content = check_fix_mermaid_code_system_prompt
            user_content = check_fix_mermaid_code_user_prompt + "\n\n This is the mermaid code to check and fix: " + mermaid_code
            system_msg = {"role": "system", "content": system_content}
            user_msg = {"role": "user", "content": user_content}
            messages = [system_msg, user_msg]
            resp = llm_client.chat.completions.create(
                model="anthropic/claude-sonnet-4.5",
                messages=messages,
            )
            return resp.choices[0].message.content
        except Exception as e:
            self.logger.error(f"Error checking and fixing mermaid code: {e}")
            return mermaid_code

    async def check_fix_mermaid_code(self, content: str) -> str:
        """
        Check and fix all Mermaid code blocks in the provided content.
        
        Extracts Mermaid blocks using regex, fixes each inner code snippet in parallel via LLM,
        and replaces the original blocks precisely to avoid corrupting surrounding text.
        
        Args:
            content (str): The input content potentially containing Mermaid blocks.
        
        Returns:
            str: The content with fixed Mermaid blocks.
        """
        pattern = r"```mermaid\s*(.*?)\s*```"
        matches = list(re.finditer(pattern, content, re.DOTALL))
        if not matches:
            return content

        # Extract inner codes
        inners = [m.group(1) for m in matches]

        # Fix inners in parallel
        fixed_inners = await asyncio.gather(
            *[self._llm_mermaid_code_fixing(inner) for inner in inners]
        )

        # Reconstruct content with fixed blocks
        parts = []
        prev_end = 0
        for i, match in enumerate(matches):
            start = match.start()
            end = match.end()
            # Append unchanged content before this block
            parts.append(content[prev_end:start])
            # Reconstruct block: prefix + fixed_inner + suffix
            inner_start = match.start(1)
            inner_end = match.end(1)
            prefix = content[start:inner_start]
            suffix = content[inner_end:end]
            new_block = prefix + fixed_inners[i] + suffix
            parts.append(new_block)
            prev_end = end
        # Append remaining content
        parts.append(content[prev_end:])
        return ''.join(parts)

class P3Agent:
    def __init__(
        self,
        cursory_explanation: str,
        repo_hash: str,
        max_iterations: int = 10,
        repo_type: Literal["application", "library", "service"] = "application",
    ):
        self.repo_hash = repo_hash
        self.max_iterations = max(max_iterations, self._get_file_count())
        self.repo_type = repo_type
        self.cursory_explanation = cursory_explanation
        self.output_model = {"type": "text"}
        self.tool_schemas = self._get_tool_schemas()
        self.logger = logger_instance
        self.repo_path = settings.PARENT_DIR + "/" + self.repo_hash

    def _get_file_count(self) -> int:
        '''
        Get the number of files in the repository recursively.
        '''
        path = settings.PARENT_DIR + "/" + self.repo_hash
        count = 0
        for _, _ , files in os.walk(path):
            count += len(files)
        return count

    def _get_tool_schemas(self) -> List[Dict[str, Any]]:
        return [{
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Read the entire contents of a file given its path to get detailed information about it.",
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
Generate comprehensive API Documentation for this application in markdown format.

Include:
- Overview of the API
- List of endpoints with HTTP methods, paths, descriptions
- For each endpoint: parameters (query, body), request/response schemas, example requests/responses in code blocks
- Authentication if applicable

Use the read_file tool to inspect route files, models, etc., for accurate details.

Output as a single markdown document starting with # API Documentation. Focus on files that are likely to be relevant for API documentation.
"""
        elif self.repo_type == "library":
            return base_instruction + """
Generate a detailed API Reference for this library in markdown format.

Include:
- Overview
- Detailed sections for each major class, function, type
- For each: description, parameters, return types, exceptions
- Usage examples in code blocks

Use the read_file tool to read source files for precise signatures and docstrings.

Output as a single markdown document starting with # API Reference. Focus on files that are likely to be relevant for usage of the library.
"""
        elif self.repo_type == "service":
            return base_instruction + """
Generate comprehensive API Documentation for this service in markdown format.

Similar to application: endpoints, methods, params, examples.

Use read_file for details.

Output starting with # API Documentation. Focus on files that are likely to be relevant for API documentation of the service.
"""
        else:
            return base_instruction

    async def _execute_tool_call(self, tool_call: Any) -> Dict[str, Any]:
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
                def read_file_sync():
                    with open(path, 'r', encoding='utf-8') as file:
                        return file.read()
                result = await asyncio.to_thread(read_file_sync)
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

    async def run(self) -> str:
        system_content = agent_generate_project_p3_system_prompt
        structure_instructions = self._get_structure_instructions()
        system_msg = {"role": "system", "content": system_content}
        messages = [{"role": "user", "content": structure_instructions}]
        full_messages = [system_msg] + messages

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

            tool_call_tasks = [self._execute_tool_call(tool_call) for tool_call in choice.message.tool_calls]
            tool_msgs = await asyncio.gather(*tool_call_tasks, return_exceptions=True)
            
            for i, tool_msg in enumerate(tool_msgs):
                if isinstance(tool_msg, Exception):
                    tool_call = choice.message.tool_calls[i]
                    tool_msgs[i] = {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": f"Error executing tool: {str(tool_msg)}"
                    }
            
            full_messages.extend(tool_msgs)

        final_msg = full_messages[-1]
        if final_msg.get("role") == "assistant" and "content" in final_msg:
            return final_msg["content"]
        else:
            return "No valid response generated."