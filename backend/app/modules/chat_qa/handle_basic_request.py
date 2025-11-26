import os
from typing import List, Dict
import json
from core.llm_clients import llm_client
from core.config import settings
from core.logger import logger_instance
from app.modules.auto_generation.service import AutoGenerationService
from app.modules.auto_generation.service_definations import ParseDefinitionsService




# Ensure a boolean flag
IS_PRO_USER = True if "TRUE" in settings.IS_PRO_USER.upper() else False

MAX_ITERATIONS = 1
if IS_PRO_USER:
    from pro_features.tree_traversal import tree_traversal_tool, get_indexed_repo_symbols
    MAX_ITERATIONS = 10


auto_gen_service = AutoGenerationService()
parse_definations = ParseDefinitionsService()

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_repo_cursory_explanation",
            "description": (
                "Get info about the tree structure of repository "
                "and a brief explanation about each file"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "project_context": {
                        "type": "string",
                        "description": "A string containing brief information about each file present in project",
                    }
                },
                "required": ["project_context"],
            },
        },
    },
]


# tool definitions
def get_repo_cursory_explanation_tool(project_context: Dict[str, str]) -> str:
    return "Project Cursory Explanation:\n" + project_context["cursory_explanation"]


TOOL_MAPPING = {
    "get_repo_cursory_explanation": get_repo_cursory_explanation_tool,
}
if IS_PRO_USER:
    TOOL_MAPPING["get_details_from_scope"] = tree_traversal_tool
    TOOLS.append(
        {
            "type": "function",
            "function": {
                "name": "get_details_from_scope",
                "description": "Get details of codebase from the scope of the project, example: 'project_name/src/app/models/user.py'",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "scope": {
                            "type": "string",
                            "description": "The path to the file from root of the project, example: 'project_name/src/app/models/user.py'",
                        }
                    },
                    "required": ["scope"],
                },
            },
        }
    )


def call_llm(msgs: List):
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
    You should use the tools to answer questions when its necessary.
    """
    system_prompt = [{"role": "system", "content": system_prompt}]

    for attempt in range(1, max_retries + 1):
        try:
            resp = llm_client.chat.completions.create(
                model="gpt-5-mini",
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


def get_tool_response(tool_call,project_context: str = None, repo_hash: str = None, repo_symbols: List[Dict] = None):
    """Execute a tool call returned by the LLM.

    Args:
        response: The LLM response object containing a tool call.
        project_context: Optional project context.
        repo_hash: Optional repo hash.
        repo_symbols: Optional repo symbols.
    """
    # tool_call = response.choices[0].message.tool_calls[0]
    tool_name = tool_call.function.name
    tool_args = json.loads(tool_call.function.arguments)

    logger_instance.info(f"Preparing to execute tool: {tool_name} with raw args: {tool_args}")
    if repo_hash:
        logger_instance.info(f"Tool execution will use repo hash : {repo_hash}")

    # Resolve relative paths for common arg names
    resolved_args = dict(tool_args)
    if "project_context" in resolved_args:
        resolved_args["project_context"] = project_context
    if "scope" in resolved_args:
        resolved_args["scope"] = resolved_args["scope"]
        resolved_args["repo_symbols"] = repo_symbols
        resolved_args["repo_hash"] = repo_hash
    try:
        tool_result = TOOL_MAPPING[tool_name](**resolved_args)


        logger_instance.info(f"Tool {tool_name} result: {tool_result}")

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


# loop


async def run_basic_agentic_loop(messages, max_iterations=MAX_ITERATIONS, repo_hash=None):
    """Run an agentic loop with file operation tools."""

    project_document = await auto_gen_service.get_project_intro_by_hash(repo_hash)
    project_context = {
        "intro": project_document["project_intro"],
        "cursory_explanation": project_document["project_cursory_explanation"],
        "data_flow_diagram": project_document["project_data_flow_diagram"],
    }
    repo_symbols = []
    if IS_PRO_USER:
        repo_symbols = get_indexed_repo_symbols(repo_hash)

    messages[0]["content"] = (
        "Project Introduction:\n"
        + project_context["intro"]
        + "\n\n"
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
            for tool_call in resp.choices[0].message.tool_calls:
                messages.append(
                    get_tool_response(
                        tool_call, project_context=project_context, repo_hash=repo_hash, repo_symbols=repo_symbols
                    )
                )
        else:
            logger_instance.info("No tool calls detected, ending loop")
            break

    if iteration_count >= max_iterations:
        logger_instance.error(f"Maximum iterations ({max_iterations}) reached")

    logger_instance.info(f"Agentic loop completed after {iteration_count} iterations")
    return messages[-1]["content"]


async def resolve_definations(message, mentioned_definations: List[Dict], repo_hash: str):
    definations_full_info = await parse_definations.get_all_node_full_info(repo_hash)
    additional_info = ""
    additional_info += f"""
    The following are the definitions of the mentioned code file, classes or functions mentioned in the user message:\n\n
    """
    for mentioned_defination in mentioned_definations:
        for definations in definations_full_info:
            if definations['node_name'] == mentioned_defination.node_name and definations['file_name'] == mentioned_defination.file_name and definations["start_end_lines"][0] == mentioned_defination.start_end_lines[0] and definations["start_end_lines"][1] == mentioned_defination.start_end_lines[1] and definations["node_type"] == mentioned_defination.node_type:
                additional_info += f""" \n\n
                The code snippet of @{mentioned_defination.node_name} which is mentioned above is:
                ```
                {definations['code_snippet']}
                ```\n\n
                """
                break
    # message = message.replace(f"@{definitions['node_name']}", f"@{definitions['node_name']}")
    return message + additional_info

# if __name__ == "__main__":
#     _messages = [
#         {
#             "role": "user",
#             "content": "Explain how chain_log_handler.py works in DETAIL, using codebase",
#         },
#     ]
#     result = run_basic_agentic_loop(
#         _messages,
#         repo_hash="841a2e8c754b3a577e09ddd7ffba4642275442d2578096b4fcb24f64662c105a",
#     )
#     logger_instance.info("Example usage completed")
#     print("Final result:", result)
