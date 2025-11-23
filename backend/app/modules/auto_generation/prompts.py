previous_mermaid_mistakes_compressed = """

Error 1: - This error occured because of quotes inside the nodes
Error message: ```Parse error on line 6:
...hromaDB[(ChromaDB\n"pdf_collection")]:::
-----------------------^
Error 2: - This error occured because of unwanter space infront of :::
Error message: ```Parse error on line 7:
...y Point\necho.py")] :::entry    FastMCP
-----------------------^

Error 3: - This error occured becuase of using reserved 'end' keyword
Error message: ```Parse error on line 37:
...t:bold    classDef end fill:#E0F2F1,str
----------------------^

Error 4: - This error occured becuase of using reserved 'end' keyword`
Error message: ```Parse error on line 13:
...ult([13. Result]):::end    subgraph Fro
-----------------------^

Error 5: - This error occured becuase of using reserved 'end' keyword
Error message: ```Parse error on line 13:
...ult([13. Result]):::end    subgraph Fro
-----------------------^

Error 6: - This error occured because of unwanter space infront of :::
Error message: ```Parse error on line 8:
...ontend Next.js App] :::entry    Backend
-----------------------^
Error 7: - This error occured because of unwanter space infront of :::
Error message: ```Parse error on line 8:
...ontend Next.js App] :::Entry    B[2. Ba
-----------------------^

Error 8: - This error occured because of unwanter space infront of :::
Error message: ```Parse error on line 8:
...end\nNext.js App")] :::Entry    B[("Bac
-----------------------^e

Error 9: - This error occured because of using double square brackets inside the nodes
Error: Error: Parse error on line 11:
...):::entryClientUI([[2. CLI Client]]):::
----------------------^

Error 10: - This error occured because of using curved brackets inside the nodes
Error: Error: Parse error on line 8:
...ntUI[[2. CLI Client (client.py)]]Client
-----------------------^

Error 11: - This error occured because of using curved brackets inside the nodes
Error: Error: Parse error on line 16:
...sS1[[5. MCP Server (mcp_server.py)]]:::
----------------------^

Error 12: - This error occured because of using curly braces to make nodes
Error: On line 13
MermaidDetailedError: Parse error on line 14:
...on_info:::processB5{9. Read PDF Resourc
----------------------^

"""

agent_generate_project_p1_system_prompt = """You are a technical writer who creates clear, engaging project introductions. Assume the user is very technical and show the technical details of the project in markdown format with proper headings, subheadings, lists etc. The repo type is {repo_type}. You aim to be technical."""

