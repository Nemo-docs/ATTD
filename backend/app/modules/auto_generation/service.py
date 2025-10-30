import os
import concurrent.futures
import tiktoken
import logging
import hashlib
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from pymongo.collection import Collection
from pymongo.errors import PyMongoError
from dotenv import load_dotenv
from clients import open_router_client, mongodb_client
from app.modules.auto_generation.models import ProjectIntroModel


load_dotenv()


class AutoGenerationService:
    """
    This service is responsible for generating following contents for the repo mentioned by user.
    a.    intro: This is the intro for the project.
    b.    project structure: This is the project structure for the project.
    c.    cursory explanation for each code file
    """

    def __init__(self):
        self.tokenizer = tiktoken.get_encoding("cl100k_base")  # GPT-4 tokenizer
        self.max_tokens = 50_000_000  # 50M tokens limit
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        # show line numbers in logs
        self.logger.addHandler(logging.StreamHandler())
        self.logger.propagate = False
        self.logger.handlers[0].setFormatter(
            logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(lineno)d"
            )
        )

        # Database setup
        self.db_name = os.getenv("MONGODB_DATABASE", "attd_db")
        self.collection_name = os.getenv("MONGODB_COLLECTION", "project_intros")
        self.db = mongodb_client[self.db_name]
        self.collection: Collection = self.db[self.collection_name]

        # Create index on repo_hash for faster lookups
        try:
            self.collection.create_index("repo_hash", unique=True)
            self.logger.info(
                f"Created unique index on repo_hash in collection {self.collection_name}"
            )
        except PyMongoError as e:
            self.logger.warning(f"Could not create index: {e}")

    def generate_intro(self, github_url: str, repo_hash: str, name: str) -> Dict:
        """
        Generate project introduction and data flow diagram, then save to database.
        If repo already exists in database, return existing data instead of regenerating.

        Input: Repository hash
        Output: Dictionary containing project intro data and cursory explanation
        """
        try:
            # Step 1: Check if repo already exists in database
            self.logger.info(f"Checking if project intro exists for repo: {repo_hash}")
            existing_intro = self._get_project_intro(repo_hash)

            if existing_intro:
                self.logger.info(f"Found existing intro for repo: {repo_hash}")
                # Return existing data with additional metadata
                return {
                    "repo_path": existing_intro.get("repo_path"),
                    "repo_hash": existing_intro.get("repo_hash"),
                    "project_intro": existing_intro.get("project_intro"),
                    "project_data_flow_diagram": existing_intro.get(
                        "project_data_flow_diagram"
                    ),
                    "project_cursory_explanation": existing_intro.get(
                        "project_cursory_explanation"
                    ),
                    "saved_to_db": True,
                    "retrieved_from_db": True,
                    "created_at": existing_intro.get("created_at"),
                    "updated_at": existing_intro.get("updated_at"),
                }

            # Step 2: Generate new intro if not found in database
            self.logger.info(
                f"Generating new cursory explanation for repo: {repo_hash}"
            )
            cursory_explanation = self._generate_cursory_explanation(repo_hash)

            if cursory_explanation.startswith("Error:"):
                return f"Error in generate_intro: {cursory_explanation}"

            # Step 3: Analyze project structure and generate intro
            intro_prompt = f"""Based on the following project structure and file descriptions, create a comprehensive introduction for this software project. Focus on what the project does, its purpose, and aim to be very technical.

Project Structure and File Roles:
{cursory_explanation}

Please provide:

1. **Project Overview**: A 2-3 paragraph introduction explaining what this project does, its main purpose, and target users/audience.

2. **Key Components**: Based on the file structure, identify the main components or modules and explain their roles at a high level.

3. **Technology Stack**: Infer the technology stack from the file extensions and structure.

4. **Project Goals**: What problems does this project solve?

5. **Technical Details**: Assume the user is very technical and show the technical details of the project in short and concise manner.

6. Wrap filenames in backticks (`` file ``). It improves readability and avoids mis-parsing.

7. If a horizontal rule is desired, --- is fine, but ensure it's on a line by itself and not adjacent to list items (add a blank line above/below).

Write markdown format with proper headings and subheadings.

Format the response as a coherent introduction that someone unfamiliar with the codebase could understand. Be professional, clear, and engaging."""

            # Step 4: Generate the introduction using OpenAI
            intro_response = open_router_client.chat.completions.create(
                model="openai/gpt-5-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a technical writer who creates clear, engaging project introductions. Focus on the project's purpose and value rather than implementation details. Assume the user is very technical and show the technical details of the project in short and concise manner.",
                    },
                    {"role": "user", "content": intro_prompt},
                ],
                max_tokens=2000,
                temperature=0.7,
            )

            project_intro = intro_response.choices[0].message.content.strip()

            # Step 5: Generate data flow diagram
            diagram_prompt = f"""Based on the following project structure and file descriptions, create a Mermaid diagram showing the data flow and component interactions. Focus on the logical flow of data through the system.

Project Structure and File Roles:
{cursory_explanation}

Analyze the project structure and create a Mermaid flowchart that shows:

1. **Main Components**: Identify key modules, services, or layers
2. **Data Flow**: Show how data moves between components
3. **External Interfaces**: Show any external APIs, databases, or user interfaces
4. **Processing Flow**: Show the main processing pipeline
5. **Technical Details**: Assume the user is very technical and show the technical details of the project

**IMPORTANT STYLING REQUIREMENTS:**
- Use high-contrast colors for maximum readability
- Add step numbers to show process flow sequence
- Use descriptive labels that are easy to understand
- Apply visual hierarchy with different node shapes and colors
- Make the diagram clean and professional

**Color Scheme:**
- User Interface: Light blue (#E1F5FE) with dark text
- Business Logic/Services: Light green (#E8F5E8) with dark text
- Data Processing: Light yellow (#FFFDE7) with dark text
- Database/Storage: Light purple (#F3E5F5) with dark text
- External APIs: Light orange (#FFE0B2) with dark text
- Start/Entry points: Light cyan (#E0F2F1) with dark text

**Node Shapes:**
- Use rectangles [Node] for components
- Use rounded rectangles [Node] for user interfaces
- Use cylinders [(Database)] for data storage
- Use hexagons {{Node}} for processing steps
- Use diamonds {{Node}} for decision points

**Example format with enhanced styling:**
```mermaid
graph TD
    %% Define styles for high contrast and readability
    classDef userInterface fill:#E1F5FE,stroke:#01579B,stroke-width:2px,color:#000
    classDef serviceLayer fill:#E8F5E8,stroke:#2E7D32,stroke-width:2px,color:#000
    classDef dataProcessing fill:#FFFDE7,stroke:#F57C00,stroke-width:2px,color:#000
    classDef database fill:#F3E5F5,stroke:#4A148C,stroke-width:2px,color:#000
    classDef externalAPI fill:#FFE0B2,stroke:#E65100,stroke-width:2px,color:#000

    %% Start point with step number
    A[1. User Request] --> B[2. Input Processing]
    B --> C[3. Business Logic]
    C --> D[4. Data Processing]
    D --> E[(5. Database)]
    C --> F[6. External API]

    %% Apply styles
    class A userInterface
    class B dataProcessing
    class C serviceLayer
    class D dataProcessing
    class E database
    class F externalAPI
```

Provide only the Mermaid diagram code, properly formatted and functional with enhanced styling."""

            # Step 6: Generate the diagram using OpenAI
            diagram_response = open_router_client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert in creating Mermaid diagrams for software architecture. Focus on clear, logical data flow diagrams with excellent visual design. Always use step numbers, high-contrast colors, and clear visual hierarchy. Make diagrams that are immediately understandable to both technical and non-technical audiences. Use the specified color scheme and styling requirements to create professional, readable diagrams.",
                    },
                    {"role": "user", "content": diagram_prompt},
                ],
                max_tokens=1000,
                temperature=0.3,
            )

            project_diagram = diagram_response.choices[0].message.content.strip()

            # Step 7: Clean up the diagram response (remove markdown code blocks if present)
            if project_diagram.startswith("```mermaid"):
                project_diagram = (
                    project_diagram.replace("```mermaid", "").replace("```", "").strip()
                )
            elif project_diagram.startswith("```"):
                project_diagram = project_diagram.replace("```", "").strip()

            # Step 8: Combine intro and diagram (not used in final output)

            # Step 9: Create project intro model and save to database
            project_intro_model = ProjectIntroModel(
                repo_path=os.getenv("PARENT_DIR") + "/" + repo_hash,
                repo_hash=repo_hash,
                project_intro=project_intro,
                project_data_flow_diagram=project_diagram,
                project_cursory_explanation=cursory_explanation,
                github_url=github_url,
                name=name,
            )

            # Convert to dict for database storage
            project_data = project_intro_model.dict()

            # Save to database
            self.logger.info(f"Saving project intro to database for repo: {repo_hash}")
            save_success = self._save_project_intro(project_data)

            if not save_success:
                self.logger.warning(
                    f"Failed to save project intro to database for repo: {repo_hash}"
                )

            # Return the generated data
            result_data = {
                "repo_hash": project_intro_model.repo_hash,
                "project_intro": project_intro,
                "project_data_flow_diagram": project_diagram,
                "project_cursory_explanation": cursory_explanation,
                "saved_to_db": save_success,
            }

            self.logger.info(f"Generated intro successfully for repo: {repo_hash}")
            return result_data

        except Exception as e:
            self.logger.error(f"Error generating intro: {str(e)}")
            return {"error": str(e), "repo_hash": repo_hash}

    def _generate_cursory_explanation(self, repo_hash: str) -> str:
        """
        Input: Repo hash
        Output: Tree hierarchy string of file names with their roles (cursory explanation)
        """
        try:
            repo_path = os.getenv("PARENT_DIR") + "/" + repo_hash
            # Step 1: Get all files excluding common irrelevant directories
            useful_files = self._get_useful_files(repo_path)

            # Step 2: Calculate total tokens
            total_tokens = self._calculate_total_tokens(useful_files)
            if total_tokens > self.max_tokens:
                raise ValueError(
                    f"Total tokens ({total_tokens}) exceed 50M limit. Cannot process repository."
                )
            self.logger.info(f"Total tokens: {total_tokens}")
            # Step 3: Organize files in logical order
            organized_files = self._organize_files_logically(useful_files)
            self.logger.info(f"Organized files: {organized_files}")
            # Step 4: Generate role descriptions
            file_roles = self._generate_file_roles(organized_files)
            self.logger.info(f"File roles: {file_roles}")
            # Step 5: Convert to tree hierarchy
            tree_output = self._create_tree_hierarchy(repo_path, file_roles)
            self.logger.info(f"Tree output: {tree_output}")
            return tree_output

        except Exception as e:
            return f"Error: {str(e)}"

    def _get_useful_files(self, repo_path: str) -> List[str]:
        """Get list of useful files, filtering out irrelevant ones."""
        try:
            # Use os.walk for cross-platform file listing
            all_files = []
            for root, dirs, files in os.walk(repo_path):
                # Skip irrelevant directories
                dirs[:] = [
                    d
                    for d in dirs
                    if d
                    not in {
                        ".git",
                        "node_modules",
                        "__pycache__",
                        ".next",
                        "build",
                        "dist",
                        ".venv",
                        "venv",
                        ".env",
                    }
                    and not d.startswith(".")
                ]

                for file in files:
                    file_path = os.path.join(root, file)
                    all_files.append(file_path)

            # Filter for useful file extensions and exclude irrelevant files
            useful_extensions = {
                # Code files
                ".py",
                ".js",
                ".ts",
                ".tsx",
                ".jsx",
                ".java",
                ".cpp",
                ".c",
                ".h",
                ".hpp",
                ".cs",
                ".php",
                ".rb",
                ".go",
                ".rs",
                ".swift",
                ".kt",
                ".scala",
                # Config files
                ".json",
                ".yaml",
                ".yml",
                ".toml",
                ".xml",
                ".ini",
                ".cfg",
                ".conf",
                # Documentation
                ".md",
                ".rst",
                ".txt",
                # Web files
                ".html",
                ".css",
                ".scss",
                ".sass",
                ".less",
                # Shell scripts
                ".sh",
                ".bash",
                ".zsh",
                ".fish",
                # Other important files
                "Makefile",
                "CMakeLists.txt",
                "requirements.txt",
                "pyproject.toml",
                "package.json",
                "tsconfig.json",
                "webpack.config.js",
            }

            irrelevant_files = {"package-lock.json", "yarn.lock", ".DS_Store"}

            useful_files = []
            for file_path in all_files:
                file_name = os.path.basename(file_path)
                file_ext = os.path.splitext(file_path)[1].lower()

                # Skip files with irrelevant extensions
                if file_ext in {".pyc", ".log", ".lock", ".min.js", ".min.css"}:
                    continue

                # Skip specific irrelevant files
                if file_name in irrelevant_files:
                    continue

                # Include useful files
                if (
                    file_ext in useful_extensions
                    or file_name in useful_extensions
                    or (
                        file_name.startswith(".")
                        and file_ext
                        in {
                            ".gitignore",
                            ".env",
                            ".eslintrc",
                            ".prettierrc",
                            ".dockerignore",
                        }
                    )
                ):
                    useful_files.append(file_path)

            return useful_files

        except Exception as e:
            raise Exception(f"Error getting useful files: {str(e)}")

    def _calculate_total_tokens(self, file_paths: List[str]) -> int:
        """Calculate total tokens for all files combined."""
        total_tokens = 0

        for file_path in file_paths:
            try:
                if os.path.exists(file_path) and os.path.isfile(file_path):
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        tokens = len(self.tokenizer.encode(content))
                        total_tokens += tokens
            except Exception:
                # Skip files that can't be read
                continue

        return total_tokens

    def _organize_files_logically(self, file_paths: List[str]) -> List[str]:
        """Organize files in a logical order for human understanding."""
        # Define priority order for file types
        priority_order = [
            # Documentation first
            ("README.md", "readme", "README"),
            # Main config files
            (
                "package.json",
                "pyproject.toml",
                "requirements.txt",
                "setup.py",
                "Cargo.toml",
                "go.mod",
            ),
            # Config files
            (".yml", ".yaml", ".json", ".toml", ".xml", ".ini", ".cfg"),
            # Main application files
            (
                "main.py",
                "app.py",
                "__init__.py",
                "index.js",
                "main.js",
                "App.tsx",
                "app.tsx",
            ),
            # Source code by type
            (".py", ".js", ".ts", ".tsx", ".java", ".cpp", ".c", ".cs", ".go", ".rs"),
            # Web files
            (".html", ".css", ".scss", ".less"),
            # Scripts and other files
            (".sh", ".bash", ".md", ".txt", ".rst"),
        ]

        def get_file_priority(file_path: str) -> Tuple[int, str]:
            """Get priority score and secondary sort key for a file."""
            file_name = os.path.basename(file_path).lower()
            file_ext = os.path.splitext(file_path)[1].lower()

            # Check each priority group
            for priority, patterns in enumerate(priority_order):
                for pattern in patterns:
                    if pattern.startswith("."):
                        # Extension match
                        if file_ext == pattern:
                            return (priority, file_path.lower())
                    else:
                        # Exact name match
                        if file_name == pattern.lower():
                            return (priority, file_path.lower())

            # Default priority for unmatched files
            return (len(priority_order), file_path.lower())

        # Sort files by priority, then by path
        sorted_files = sorted(file_paths, key=get_file_priority)

        return sorted_files

    def _generate_file_roles(self, file_paths: List[str]) -> Dict[str, str]:
        """Generate brief role descriptions for each file using OpenAI.

        This implementation processes file batches concurrently using a
        ThreadPoolExecutor to speed up analysis for large repositories.
        """
        file_roles: Dict[str, str] = {}

        # Process files in batches to avoid token limits
        batch_size = 1

        # Build batches
        batches = [
            file_paths[i : i + batch_size]
            for i in range(0, len(file_paths), batch_size)
        ]

        if not batches:
            return file_roles

        # Limit concurrency to a reasonable number
        max_workers = min(4 * (os.cpu_count() or 1), len(batches))

        def process_batch(batch_files: List[str]) -> Dict[str, str]:
            """Read files, call the LLM for a single batch and return a map of file_path -> description."""
            local_roles: Dict[str, str] = {}

            # Prepare file previews
            files_info: List[str] = []
            for file_path in batch_files:
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content_preview = f.read()
                        files_info.append(
                            f"File: {os.path.basename(file_path)}\nPath: {file_path}\nPreview:\n{content_preview}"
                        )
                except Exception:
                    files_info.append(
                        f"File: {os.path.basename(file_path)}\nPath: {file_path}\nPreview: Could not read file"
                    )

            prompt = f"""Analyze the following files from a software project and provide a brief appropriate length description of each file's role and purpose in the project. Be concise and technical.

Files to analyze:
{"-" * 50}
{chr(10).join(files_info)}

Return a JSON object where each key is a filename and each value is a brief description of the file's role and purpose in the project. Use point form for descriptions."""

            try:
                response = open_router_client.chat.completions.create(
                    model="openai/gpt-5-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a helpful assistant that analyzes software project files and provides a brief description of each file's role and purpose. Always respond with valid JSON.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    max_tokens=20 * 1000,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": "file_descriptions",
                            "strict": True,
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "file_name": {
                                        "type": "string",
                                        "description": "The name of the file",
                                    },
                                    "file_description": {
                                        "type": "string",
                                        "description": "The description of the file",
                                    },
                                },
                                "additionalProperties": False,
                                "required": ["file_name", "file_description"],
                            },
                        },
                    },
                )

                content = response.choices[0].message.content.strip()
                self.logger.info(f"Prompt: {prompt}")
                self.logger.info(f"Content: {content}")

                try:
                    import json

                    content = json.loads(content)
                    local_roles[file_path] = content["file_description"]
                except json.JSONDecodeError as e:
                    print(f"Failed to parse JSON response: {e}")
                    print(f"Response content: {content}")

            except Exception as e:
                # Log but do not raise so other batches can complete
                self.logger.error(f"Error processing batch {batch_files}: {e}")

            return local_roles

        # Run batches concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(process_batch, b) for b in batches]

            for future in concurrent.futures.as_completed(futures):
                try:
                    result = future.result()
                    file_roles.update(result)
                except Exception as e:
                    # Shouldn't happen because process_batch catches exceptions, but be defensive
                    self.logger.error(f"Batch processing raised an exception: {e}")

        return file_roles

    def _create_tree_hierarchy(self, repo_path: str, file_roles: Dict[str, str]) -> str:
        """Create a tree hierarchy string representation of file roles."""
        from collections import defaultdict

        # Normalize paths to be relative to repo_path
        repo_name = os.path.basename(repo_path.rstrip(os.sep))
        relative_files = {}

        for full_path, description in file_roles.items():
            try:
                # Make path relative to repo_path
                rel_path = os.path.relpath(full_path, repo_path)
                # Normalize path separators for consistency
                rel_path = rel_path.replace(os.sep, "/")
                relative_files[rel_path] = description
            except ValueError:
                # If relpath fails, use the basename
                relative_files[os.path.basename(full_path)] = description

        # Build tree structure
        tree = defaultdict(dict)

        for rel_path, description in relative_files.items():
            parts = rel_path.split("/")
            current = tree

            # Navigate/build the tree structure
            for i, part in enumerate(
                parts[:-1]
            ):  # All parts except the last (filename)
                if part not in current:
                    current[part] = {}
                current = current[part]

            # Add the file with its description
            filename = parts[-1]
            current[filename] = description

        # Generate tree string
        def build_tree_string(node, prefix="", is_last=True):
            lines = []

            if isinstance(node, str):
                # This is a file with description
                lines.append(f"{prefix}{node}")
                return lines

            # This is a directory
            items = list(node.items())

            for i, (name, value) in enumerate(items):
                is_last_item = i == len(items) - 1

                if isinstance(value, dict):
                    # Directory
                    if i == 0:
                        lines.append(f"{prefix}{name}/")
                        sub_prefix = prefix + ("    " if is_last else "│   ")
                    else:
                        lines.append(
                            f"{prefix}{'└── ' if is_last_item else '├── '}{name}/"
                        )
                        sub_prefix = prefix + ("    " if is_last_item else "│   ")

                    # Recursively build subtree
                    subtree_lines = build_tree_string(value, sub_prefix, is_last_item)
                    lines.extend(subtree_lines)
                else:
                    # File with description
                    connector = "└── " if is_last_item else "├── "
                    lines.append(f"{prefix}{connector}{name}")
                    # Add description on next line with proper indentation
                    desc_prefix = prefix + ("    " if is_last_item else "│   ")
                    # Wrap description if too long
                    desc = str(value)
                    if len(desc) > 80:
                        # Simple wrapping - could be improved
                        words = desc.split()
                        current_line = ""
                        wrapped_lines = []
                        for word in words:
                            if len(current_line + " " + word) > 80:
                                wrapped_lines.append(current_line)
                                current_line = word
                            else:
                                current_line += (" " + word) if current_line else word
                        if current_line:
                            wrapped_lines.append(current_line)
                        desc = "\n".join(wrapped_lines)

                    if "\n" in desc:
                        # Multi-line description
                        desc_lines = desc.split("\n")
                        for j, desc_line in enumerate(desc_lines):
                            if j == 0:
                                lines.append(f"{desc_prefix}    {desc_line}")
                            else:
                                lines.append(f"{desc_prefix}    {desc_line}")
                    else:
                        lines.append(f"{desc_prefix}    {desc}")

            return lines

        # Build the tree starting with repo name
        tree_lines = [f"{repo_name}/"]
        subtree_lines = build_tree_string(tree)
        tree_lines.extend(subtree_lines)

        return "\n".join(tree_lines)

    def get_project_intro(self, repo_path: str) -> Optional[Dict]:
        """
        Retrieve project introduction from database.

        Args:
            repo_path: The path to the repository

        Returns:
            Optional[Dict]: Project intro data if found, None otherwise
        """
        try:
            self.logger.info(f"Retrieving project intro for repo: {repo_path}")
            return self._get_project_intro_by_path(repo_path)
        except Exception as e:
            self.logger.error(f"Error retrieving project intro: {str(e)}")
            return {"error": str(e), "repo_path": repo_path}

    def get_project_intro_by_hash(self, repo_hash: str) -> Optional[Dict]:
        """
        Retrieve project introduction from database by hash.

        Args:
            repo_hash: The hash of the repository

        Returns:
            Optional[Dict]: Project intro data if found, None otherwise
        """
        try:
            self.logger.info(f"Retrieving project intro for hash: {repo_hash}")
            return self._get_project_intro(repo_hash)
        except Exception as e:
            self.logger.error(f"Error retrieving project intro by hash: {str(e)}")
            return {"error": str(e), "repo_hash": repo_hash}

    def delete_project_intro(self, repo_path: str) -> bool:
        """
        Delete project introduction from database.

        Args:
            repo_path: The path to the repository

        Returns:
            bool: True if deleted successfully, False otherwise
        """
        try:
            repo_hash = hashlib.sha256(repo_path.encode()).hexdigest()
            self.logger.info(f"Deleting project intro for repo: {repo_path}")
            return self._delete_project_intro(repo_hash)
        except Exception as e:
            self.logger.error(f"Error deleting project intro: {str(e)}")
            return False

    # Database operations (moved from database.py)

    def _save_project_intro(self, project_data: Dict[str, Any]) -> bool:
        """
        Save project introduction data to MongoDB.

        Args:
            project_data: Dictionary containing project intro data

        Returns:
            bool: True if saved successfully, False otherwise
        """
        try:
            # Add timestamps
            project_data["created_at"] = datetime.utcnow()
            project_data["updated_at"] = datetime.utcnow()

            # Insert or update based on repo_hash
            result = self.collection.replace_one(
                {"repo_hash": project_data["repo_hash"]}, project_data, upsert=True
            )

            if result.upserted_id or result.modified_count > 0:
                self.logger.info(
                    f"Successfully saved project intro for hash: {project_data['repo_hash']}"
                )
                return True
            else:
                self.logger.warning(
                    f"No changes made for project hash: {project_data['repo_hash']}"
                )
                return False

        except PyMongoError as e:
            self.logger.error(f"Error saving project intro to database: {e}")
            raise e

    def _get_project_intro(self, repo_hash: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve project introduction data from MongoDB by repo hash.

        Args:
            repo_hash: The hash of the repository

        Returns:
            Optional[Dict]: Project intro data if found, None otherwise
        """
        try:
            result = self.collection.find_one({"repo_hash": repo_hash})
            if result:
                # Remove MongoDB _id field for cleaner response
                result.pop("_id", None)
                self.logger.info(f"Retrieved project intro for hash: {repo_hash}")
                return result
            else:
                self.logger.info(f"No project intro found for hash: {repo_hash}")
                return None

        except PyMongoError as e:
            self.logger.error(f"Error retrieving project intro from database: {e}")
            raise e

        # def _get_project_intro_by_path(self, repo_path: str) -> Optional[Dict[str, Any]]:
        #     """
        #     Retrieve project introduction data from MongoDB by repo path.

        #     Args:
        #         repo_path: The path to the repository

        #     Returns:
        #         Optional[Dict]: Project intro data if found, None otherwise
        #     """
        #     try:
        #         # Create hash from repo path
        #         repo_hash = ProjectIntroModel.repo_hash

        #         return self._get_project_intro(repo_hash)

        except Exception as e:
            self.logger.error(f"Error retrieving project intro by path: {e}")
            return None

    def _delete_project_intro(self, repo_hash: str) -> bool:
        """
        Delete project introduction data from MongoDB by repo hash.

        Args:
            repo_hash: The hash of the repository

        Returns:
            bool: True if deleted successfully, False otherwise
        """
        try:
            result = self.collection.delete_one({"repo_hash": repo_hash})
            if result.deleted_count > 0:
                self.logger.info(
                    f"Successfully deleted project intro for hash: {repo_hash}"
                )
                return True
            else:
                self.logger.warning(
                    f"No project intro found to delete for hash: {repo_hash}"
                )
                return False

        except PyMongoError as e:
            self.logger.error(f"Error deleting project intro from database: {e}")
            raise e
