import json
import os
import sys
from core.log_util import logger_instance
# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from core.clients import open_router_client
from app.modules.auto_generation.service import AutoGenerationService



# Initialize the auto generation service
logger_instance.info("Initializing auto generation service")
auto_gen_service = AutoGenerationService()


def read_file_tool(file_path: str) -> str:
    """Read the contents of a file."""
    logger_instance.info(f"Reading file: {file_path}")
    try:
        # Guard: ensure path exists before attempting to open
        if not os.path.exists(file_path):
            logger_instance.error(f"read_file_tool: path does not exist: {file_path}")
            return f"Error reading file: path does not exist: {file_path}"

        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        logger_instance.info(f"Successfully read file: {file_path} ({len(content)} characters)")
        return content
    except Exception as e:
        logger_instance.error(f"Error reading file {file_path}: {str(e)}")
        return f"Error reading file: {str(e)}"


def search_files_tool(directory: str, pattern: str) -> str:
    """Search for files containing a pattern in a directory."""
    logger_instance.info(f"Searching for pattern '{pattern}' in directory: {directory}")
    try:
        # Guard: ensure directory exists
        if not os.path.exists(directory) or not os.path.isdir(directory):
            logger_instance.error(f"search_files_tool: directory does not exist: {directory}")
            return f"No files found: directory does not exist: {directory}"

        results = []
        for root, dirs, files in os.walk(directory):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        if pattern.lower() in content.lower():
                            results.append(file_path)
                except (UnicodeDecodeError, OSError):
                    continue
        result_message = (
            "\n".join(results) if results else "No files found containing the pattern."
        )
        logger_instance.info(
            f"Search completed. Found {len(results)} files matching pattern '{pattern}'"
        )
        return result_message
    except Exception as e:
        logger_instance.error(f"Error searching files in {directory}: {str(e)}")
        return f"Error searching files: {str(e)}"


def list_directory_tool(directory: str) -> str:
    """List files and directories in a given directory."""
    logger_instance.info(f"Listing directory: {directory}")
    try:
        # Guard: ensure directory exists
        if not os.path.exists(directory) or not os.path.isdir(directory):
            logger_instance.error(
                f"list_directory_tool: directory does not exist: {directory}"
            )
            return f"Error listing directory: path does not exist: {directory}"

        items = os.listdir(directory)
        files = [
            item for item in items if os.path.isfile(os.path.join(directory, item))
        ]
        dirs = [item for item in items if os.path.isdir(os.path.join(directory, item))]

        result = "Files:\n" + "\n".join(files) + "\n\nDirectories:\n" + "\n".join(dirs)
        logger_instance.info(
            f"Directory listing completed. Found {len(files)} files and {len(dirs)} directories"
        )
        return result
    except Exception as e:
        logger_instance.error(f"Error listing directory {directory}: {str(e)}")
        return f"Error listing directory: {str(e)}"


def get_project_intro_by_hash_tool(repo_hash: str) -> str:
    """Get project introduction for a repository by its hash."""
    logger_instance.info(f"Getting project introduction by hash: {repo_hash}")
    try:
        result = auto_gen_service.get_project_intro_by_hash(repo_hash)
        if result:
            logger_instance.info(
                f"Successfully retrieved project introduction for hash {repo_hash}"
            )
            return f"""Project Introduction for hash {repo_hash}:

**Repository Path:** {result.get("repo_path", "Unknown")}

**Project Intro:**
{result.get("project_intro", "No introduction available")}

**Data Flow Diagram:**
{result.get("project_data_flow_diagram", "No diagram available")}

**Cursory Explanation:**
{result.get("project_cursory_explanation", "No cursory explanation available")}

**Created:** {result.get("created_at", "Unknown")}
**Updated:** {result.get("updated_at", "Unknown")}
"""
        else:
            logger_instance.error(f"No project introduction found for hash: {repo_hash}")
            return f"No project introduction found for hash: {repo_hash}"
    except Exception as e:
        logger_instance.error(f"Error getting project intro by hash {repo_hash}: {str(e)}")
        return f"Error getting project intro by hash: {str(e)}"


TOOL_MAPPING = {
    "read_file": read_file_tool,
    "search_files": search_files_tool,
    "list_directory": list_directory_tool,
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the contents of a file",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "The path to the file to read",
                    }
                },
                "required": ["file_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_files",
            "description": "Search for files containing a specific pattern in a directory",
            "parameters": {
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "The directory to search in",
                    },
                    "pattern": {
                        "type": "string",
                        "description": "The text pattern to search for",
                    },
                },
                "required": ["directory", "pattern"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_directory",
            "description": "List all files and directories in a given directory",
            "parameters": {
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "The directory path to list",
                    }
                },
                "required": ["directory"],
            },
        },
    },
]


def call_llm(msgs):
    logger_instance.info(f"Making LLM call with {len(msgs)} messages")
    # Retry logic with exponential backoff
    import time

    max_retries = 4
    base_delay = 1.0
    last_exception = None
    system_prompt = """
    You are a helpful assistant that can answer questions about the codebase.
    You can use the tools provided to you to answer questions.
    If you dont know the answer, you should say so and not make up information.
    You should always use the tools to answer questions.
    """
    system_prompt = [{"role": "system", "content": system_prompt}]

    for attempt in range(1, max_retries + 1):
        try:
            resp = open_router_client.chat.completions.create(
                model="openai/gpt-5-mini",
                tools=TOOLS,
                messages=system_prompt + msgs,
            )
            msgs.append(resp.choices[0].message.dict())
            logger_instance.info("LLM call completed successfully")
            return resp
        except Exception as e:
            last_exception = e
            # Log the attempt and error
            logger_instance.error(
                f"LLM call failed on attempt {attempt}/{max_retries}: {str(e)}"
            )
            # For non-retryable errors, re-raise immediately
            # Here we conservatively retry on all exceptions; more fine-grained
            # handling can be added based on exception types or response codes.
            if attempt == max_retries:
                logger_instance.error("Max retries reached for LLM call, raising exception")
                raise

            # Exponential backoff with jitter
            delay = base_delay * (2 ** (attempt - 1))
            jitter = delay * 0.1
            sleep_time = delay + (jitter * (0.5 - os.urandom(1)[0] / 255.0))
            logger_instance.info(f"Retrying in {sleep_time:.2f} seconds")
            time.sleep(max(0.1, sleep_time))
    # If we exit the loop without returning, raise the last exception
    raise last_exception


def get_tool_response(response, dir_path: str = None):
    """Execute a tool call returned by the LLM, resolving relative paths using dir_path.

    Args:
        response: The LLM response object containing a tool call.
        dir_path: Optional target directory to resolve relative file/directory paths.
    """
    tool_call = response.choices[0].message.tool_calls[0]
    tool_name = tool_call.function.name
    tool_args = json.loads(tool_call.function.arguments)

    logger_instance.info(f"Preparing to execute tool: {tool_name} with raw args: {tool_args}")
    if dir_path:
        logger_instance.info(f"Tool execution will resolve paths relative to: {dir_path}")

    # Resolve relative paths for common arg names
    resolved_args = dict(tool_args)
    try:
        if "file_path" in tool_args and dir_path:
            fp = tool_args.get("file_path")
            if fp and not os.path.isabs(fp):
                resolved_args["file_path"] = os.path.normpath(
                    os.path.join(dir_path, fp)
                )

        if "directory" in tool_args and dir_path:
            d = tool_args.get("directory")
            if d and not os.path.isabs(d):
                resolved_args["directory"] = os.path.normpath(os.path.join(dir_path, d))

        logger_instance.info(f"Resolved tool args for {tool_name}: {resolved_args}")

        # Look up the correct tool locally, and call it with the resolved arguments
        tool_result = TOOL_MAPPING[tool_name](**resolved_args)

        logger_instance.info(f"Tool {tool_name} execution completed")

        return {
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": tool_result,
        }
    except KeyError:
        logger_instance.error(f"Requested tool '{tool_name}' is not available in TOOL_MAPPING")
        return {
            "role": "tool",
            "tool_call_id": getattr(tool_call, "id", None),
            "content": f"Error: unknown tool '{tool_name}'",
        }
    except Exception as e:
        logger_instance.error(f"Error executing tool {tool_name}: {str(e)}")
        return {
            "role": "tool",
            "tool_call_id": getattr(tool_call, "id", None),
            "content": f"Error executing tool '{tool_name}': {str(e)}",
        }


def run_agentic_loop(messages, max_iterations=10, repo_hash=None, dir_path=None):
    """Run an agentic loop with file operation tools."""

    project_context = auto_gen_service.get_project_intro_by_hash(repo_hash)
    project_context = f"""
    Project Introduction:
    {project_context["project_intro"]}
    Project Data Flow Diagram:
    {project_context["project_data_flow_diagram"]}
    Project Cursory Explanation:
    {project_context["project_cursory_explanation"]}
    """

    messages[0]["content"] = (
        project_context
        + "\n\n"
        + "User message:\n```\n"
        + messages[0]["content"]
        + "\n```"
    )

    logger_instance.info(f"Starting agentic loop with max {max_iterations} iterations")
    iteration_count = 0

    while iteration_count < max_iterations:
        iteration_count += 1
        logger_instance.info(f"Agentic loop iteration {iteration_count}/{max_iterations}")
        messages[-1]["content"] = (
            messages[-1]["content"]
            + f"\n\nIteration {iteration_count}/{max_iterations}"
        )
        resp = call_llm(messages)

        if resp.choices[0].message.tool_calls is not None:
            logger_instance.info("Tool calls detected, executing tools")
            messages.append(get_tool_response(resp, dir_path=dir_path))
        else:
            logger_instance.info("No tool calls detected, ending loop")
            break

    if iteration_count >= max_iterations:
        logger_instance.error(f"Maximum iterations ({max_iterations}) reached")

    # put messages in a json file
    with open("messages.json", "w") as f:
        json.dump(messages, f)
    logger_instance.info(f"Agentic loop completed after {iteration_count} iterations")
    return messages[-1]["content"]


# # Example usage
# if __name__ == "__main__":
#     logger.info("Starting example usage of dummy_handle_agentic_request")

#     # Use the repository root (current working directory)
#     repo_path = os.getcwd()

#     # Initial user message only — do not include project intro or cursory explanation here
#     _messages = [
#         {
#             "role": "user",
#             "content": "List the files in the current directory and then read the README.md file",
#         },
#     ]

#     result = run_agentic_loop(_messages)
#     logger.info("Example usage completed")
#     print("Final result:", result)
