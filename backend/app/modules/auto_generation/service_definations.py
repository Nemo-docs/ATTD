from tree_sitter import Query, Language, Parser
import tree_sitter_python as tspython
import json
from typing import Dict, List, Literal
import os
from hashlib import sha256
import uuid
from pydantic import BaseModel, Field
from pymongo.collection import Collection
from app.modules.auto_generation.models import  Definition
from datetime import datetime, timezone
from core.config import settings
from core.clients import mongodb_client
from core.logger import logger_instance
from app.modules.auto_generation.service import AutoGenerationService
from utils.git_repo_setup_utils import git_clone_files, remove_cloned_files




class ParseDefinitionsService:
    def __init__(self):
        self.auto_generation = AutoGenerationService()
        # Database setup
        self.db_name = settings.DB_NAME
        self.db = mongodb_client[self.db_name]
        self.collection: Collection = self.db["definitions"]

    def parse_definitions(self, repo_hash: str, github_url: str):
        try:
            definitions_repo: List[Definition] = []
            
            # get random id, so that files dont get deleted because of other cause
            random_id = str(uuid.uuid4())
            
            git_clone_files(repo_hash= repo_hash, random_id=random_id, github_url=github_url)
            repo_name = github_url.split("/")[-1].replace(".git", "")
            code_file_paths = self._get_all_code_files(repo_hash, random_id)

            for code_file_path in code_file_paths:
                lang = self.get_language(code_file_path)
                if lang != "not_code_file":
                    parser = self.get_parser(lang)
                else:
                    continue
                with open(code_file_path, "r", encoding="utf-8") as file:
                    code = file.read()
                tree = parser.parse(bytes(code, "utf8"))
                root = tree.root_node
                clean_code_file_path = self.clean_paths(code_file_path, repo_hash, random_id, repo_name)
                definitions_repo.extend(self._get_definitions_per_file(root, lang=lang, code=code, clean_code_file_path = clean_code_file_path))

            # save to db
            save_success = self.save_definitions(repo_hash=repo_hash, definitions=definitions_repo )
            if not save_success:
                raise Exception("Failed to save definitions to database")
            return save_success
        except Exception as e:
            logger_instance.error(f"Error getting definitions: {e}")
            raise e from e
        finally:
            remove_cloned_files(repo_hash=repo_hash, random_id=random_id)

    def save_definitions(self, repo_hash: str, definitions: List[Definition]):
        definitions_dict = [definition.model_dump() for definition in definitions]
        result = self.collection.insert_one({
            "repo_hash": repo_hash,
            "definitions": definitions_dict,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
        return result.acknowledged

    def get_all_node_short_info(self, repo_hash: str):
        """
        fetch the node type, node name, file name, start and end lines
        """
        definitions = self.collection.find_one({"repo_hash": repo_hash})
        if definitions is None:
            raise Exception(f"Definitions not found for hash: {repo_hash}")
        all_node_info = []
        for definition in definitions["definitions"]:
            all_node_info.append({"node_type":definition["node_type"], 
            "node_name":definition["node_name"], 
            "file_name":definition["file_name"], 
            "start_end_lines":definition["start_end_lines"]})
        return all_node_info

    def get_all_node_full_info(self, repo_hash: str):
        definitions = self.collection.find_one({"repo_hash": repo_hash})
        if definitions is None:
            raise Exception(f"Definitions not found for hash: {repo_hash}")
        return definitions["definitions"]

    def clean_paths(self, code_file_path: str, repo_hash: str, random_id: str, repo_name: str):
        clean_code_file_path = repo_name + "/" + code_file_path.replace(os.getenv("PARENT_DIR") + "/" + repo_hash + "/" + random_id + "/", "")
        return clean_code_file_path

    def _get_all_code_files(self, repo_hash: str, random_id: str):
        repo_dir = os.getenv("PARENT_DIR") + "/" + repo_hash + "/" + random_id + "/"
        file_path_list = []
        for root, _, files in os.walk(repo_dir):
            for file in files:
                file_path_list.append(os.path.join(root, file))
        return file_path_list


    def _get_definitions_per_file(self, node, lang, code, clean_code_file_path):
        definitions_per_file: List[Definition] = []
        # node_types = ["file", "class", "function"]
        if node.type == self.get_node_type("file", lang):
            definitions_per_file.append(Definition(node_type="file", 
                                                    node_name = clean_code_file_path.split("/")[-1],
                                                    code_snippet = code[node.start_byte:node.end_byte], 
                                                    start_end_lines = [node.start_point[0], node.end_point[0]],
                                                    file_name = clean_code_file_path))
                                                    
        elif node.type == self.get_node_type("class", lang):
            definitions_per_file.append(Definition(node_type="class", 
                                                    node_name = node.child_by_field_name("name").text.decode("utf-8"),
                                                    code_snippet = code[node.start_byte:node.end_byte], 
                                                    start_end_lines = [node.start_point[0], node.end_point[0]],
                                                    file_name = clean_code_file_path))
        elif node.type == self.get_node_type("function", lang):
            definitions_per_file.append(Definition(node_type="function",
                                                    node_name = node.child_by_field_name("name").text.decode("utf-8"),
                                                    code_snippet = code[node.start_byte:node.end_byte], 
                                                    start_end_lines = [node.start_point[0], node.end_point[0]],
                                                    file_name = clean_code_file_path))

        for node in node.children:
            definitions_per_file.extend(self._get_definitions_per_file(node, lang, code=code, clean_code_file_path = clean_code_file_path))

        return definitions_per_file
    
    def get_node_type(self, type, lang):
        if lang == "python":
            if type == "class":
                return "class_definition"
            if type == "function":
                return "function_definition"
            if type == "file":
                return "module"
        else:
            pass

    def get_language(self, file_path:str):
        extension = file_path.split('.')[-1]
        if extension == "py":
            return "python"
        else:
            return "not_code_file"
        
    def get_parser(self, lang):
        if lang == "python":
            PY_LANGUAGE = Language(tspython.language())
            return Parser(PY_LANGUAGE)
